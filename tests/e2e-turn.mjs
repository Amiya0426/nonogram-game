// 轮换模式 UI 行为测试：
// 同一格连续点击应循环 空→黑→叉→空，且每一步都从用户可观察的渲染状态验证。
// moveHistory 的合并规则由 tests/unit/moveHistory.test.js 覆盖，这里不再读取 localStorage 内部结构。
// 用法：node tests/e2e-turn.mjs [BASE_URL]
import { chromium } from 'playwright';

const BASE = process.argv[2] || process.env.TEST_BASE || 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'msedge', headless: true, locale: 'zh-CN' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
    errors.push(`CONSOLE: ${m.text()}`);
  }
});

const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

// 默认新盘即心形 5x5，无需注入存档
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.evaluate(() => localStorage.setItem('nonogram_intro_seen', '1'));
await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);

const cell = page.locator('[data-cell][data-r="0"][data-c="0"]').first();
check('棋盘格子可见', await cell.isVisible());

const readCell = () =>
  cell.evaluate((el) => ({
    bg: el.style.backgroundColor,
    cross: !!el.querySelector('.nonogram-cross'),
  }));

const waitCell = async (pred, timeout = 5000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const s = await readCell();
    if (pred(s)) return s;
    if (Date.now() > deadline) return s;
    await page.waitForTimeout(100);
  }
};

// 移开鼠标避免 hover 样式干扰断言
const leaveCell = async () => {
  await page.mouse.move(2, 2);
  await page.waitForTimeout(150);
};

// 1) 空 -> 黑（填充色为内联样式 rgb(30, 41, 59)）
await cell.click();
await leaveCell();
let s = await waitCell((x) => x.bg === 'rgb(30, 41, 59)' && !x.cross);
check('点击后变黑', s.bg === 'rgb(30, 41, 59)' && !s.cross, JSON.stringify(s));

// 2) 黑 -> 叉（渲染 .nonogram-cross）
await cell.click();
await leaveCell();
s = await waitCell((x) => x.cross === true);
check('再次点击变叉', s.cross === true, JSON.stringify(s));

// 3) 叉 -> 空（无内联背景、无叉标记）
await cell.click();
await leaveCell();
s = await waitCell((x) => x.bg === '' && !x.cross);
check('第三次点击清空', s.bg === '' && !s.cross, JSON.stringify(s));

for (const r of results) console.log(r);
console.log(`\nJS 错误数: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);

await browser.close();
process.exit(errors.length > 0 || results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
