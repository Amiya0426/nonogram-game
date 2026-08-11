// 交互流程测试：计时器、随机抽题、暂停/继续、复盘 GIF 按钮
// 用法：node tests/e2e-flow.mjs [BASE_URL]
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

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// 0) 侧边栏默认隐藏：悬停左边缘展开并固定，供后续步骤操作
await page.mouse.move(1, 450);
await page.waitForTimeout(700);
const pinBtn = page.locator('button[title="固定侧边栏"]');
check('固定侧边栏按钮存在', await pinBtn.isVisible());
await pinBtn.click();
await page.waitForTimeout(400);

// 1) 页面渲染
const rootLen = (await page.locator('#root').innerText()).length;
check('页面渲染', rootLen > 100, `root=${rootLen}`);

// 2) 计时器存在
const timer = page.locator('.font-mono').first();
check('计时器存在', await timer.isVisible());
const t1 = (await timer.innerText()).trim();
check('新盘初始 00:00', t1 === '00:00', t1);

// 3) 未点击格子前不走秒
await page.waitForTimeout(2200);
const t2 = (await timer.innerText()).trim();
check('未点击不走秒', t1 === t2, `${t1} == ${t2}`);

// 4) 点击第一个格子后开始计时
const cell = page.locator('[data-cell][data-r="0"][data-c="0"]').first();
const box = await cell.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(2200);
const t3 = (await timer.innerText()).trim();
check('首击后开始计时', /^00:0[1-9]$/.test(t3), t3);

// 5) 暂停/继续
const pauseBtn = page.getByTitle('暂停计时');
check('暂停按钮存在', await pauseBtn.isVisible());
await pauseBtn.click();
await page.waitForTimeout(200);
check('暂停后出现继续', await page.getByTitle('继续计时').isVisible());
const t4 = (await timer.innerText()).trim();
await page.waitForTimeout(1500);
const t5 = (await timer.innerText()).trim();
check('暂停不走秒', t4 === t5, `${t4} == ${t5}`);
await page.getByTitle('继续计时').click();

// 6) 随机抽题（展开"视图与棋盘设置"，点随机按钮）
const viewAcc = page.locator('button', { hasText: '视图与棋盘设置' }).first();
if (await viewAcc.isVisible()) {
  await viewAcc.click();
  await page.waitForTimeout(300);
}
const randomBtn = page.getByTitle('随机生成');
check('随机按钮存在', await randomBtn.isVisible());
await randomBtn.click();
await page.waitForTimeout(1200);
const timerAfterRandom = (await timer.innerText()).trim();
check('抽题后重置为 00:00 且不启动', timerAfterRandom === '00:00', timerAfterRandom);

// 7) 注册/登录弹窗存在（未登录时，点侧边栏按钮打开）
const authBtn = page.getByRole('button', { name: /登录 \/ 注册/ });
check('登录按钮存在', await authBtn.isVisible());
await authBtn.click();
await page.waitForTimeout(300);
const hasLoginForm = await page.getByPlaceholder('用户名').isVisible().catch(() => false);
check('登录弹窗可见', hasLoginForm);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// 8) 手机端底部导航（缩小视口）
await page.setViewportSize({ width: 420, height: 800 });
await page.waitForTimeout(500);
const mobileNav = await page.locator('button', { hasText: '导入' }).count();
check('手机端底部导航存在', mobileNav > 0);

for (const r of results) console.log(r);
console.log(`\nJS 错误数: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);

await browser.close();
process.exit(errors.length > 0 || results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
