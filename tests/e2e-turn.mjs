// 轮换模式打叉记录合并测试：
// 连续点击同一格（空→黑→叉）应只记录最终"叉"，不出现中间黑块步骤
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

// 注入 5x5 未完成盘（webpbn#304 线索 + 空盘），避免初始即完成状态
const emptyGrid = Array.from({ length: 5 }, () => new Array(5).fill(0));
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate((grid) => {
  localStorage.setItem('nonogram_master_save', JSON.stringify({
    mode: 'play',
    rows: 5,
    cols: 5,
    rowCluesStr: ['1 1', '1 1 1', '1 1', '1 1', '1'],
    colCluesStr: ['2', '1\n1', '1\n1', '1\n1', '2'],
    grid,
    gameSettings: { autoFillCross: false },
    timerRunning: true,
  }));
}, emptyGrid);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const cell = page.locator('[data-cell][data-r="0"][data-c="0"]').first();
check('棋盘格子可见', await cell.isVisible());

const readGrid = () =>
  page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('nonogram_master_save') || '{}');
    return s.grid?.[0]?.[0];
  });
const readCellGrid = (r, c) =>
  page.evaluate(([rr, cc]) => {
    const s = JSON.parse(localStorage.getItem('nonogram_master_save') || '{}');
    return s.grid?.[rr]?.[cc];
  }, [r, c]);

// 点击格子（Playwright 原生 click），返回点击后该格存档值
async function clickCell(r, c) {
  const el = page.locator(`[data-cell][data-r="${r}"][data-c="${c}"]`).first();
  await el.click();
  await page.waitForTimeout(700);
  return readCellGrid(r, c);
}

const readMoves = () =>
  page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('nonogram_master_save') || '{}');
    return { moves: s.moveHistory || [], grid: s.grid?.[0]?.[0] };
  });
const readAll = () =>
  page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('nonogram_master_save') || '{}');
    return { moves: s.moveHistory || [], hasMoveHistory: 'moveHistory' in s, keys: Object.keys(s) };
  });

// 第一次点击：空 -> 黑
const v1 = await clickCell(0, 0);
await page.waitForTimeout(800);
// 第二次点击：黑 -> 叉（轮换模式）
const v2 = await clickCell(0, 0);
await page.waitForTimeout(800); // 等自动存档

let state = await readMoves();
console.log('点2后:', JSON.stringify(state));
let moves = state.moves;
check('打叉后仅一条记录', moves.length === 1, JSON.stringify(moves));
check('记录值为叉(2)', moves[0]?.cells[0]?.val === 2,
  `val=${moves[0]?.cells[0]?.val}`);

// 第三次点击：叉 -> 空（清空，应合并更新为 0）
const v3 = await clickCell(0, 0);
await page.waitForTimeout(800);
state = await readMoves();
console.log('点3后:', JSON.stringify(state));
moves = state.moves;
check('清空后仍一条记录且值为0', moves.length === 1 && moves[0]?.cells[0]?.val === 0,
  JSON.stringify(moves));

// 不同格子操作应各自独立记录
await clickCell(1, 1);
await page.waitForTimeout(800);
state = await readMoves();
console.log('点4后:', JSON.stringify(state));
moves = state.moves;
check('不同格子独立记录', moves.length === 2, JSON.stringify(moves));

for (const r of results) console.log(r);
console.log(`\nJS 错误数: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);

await browser.close();
process.exit(errors.length > 0 || results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
