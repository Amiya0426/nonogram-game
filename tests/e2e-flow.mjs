// 交互流程测试：计时器、随机抽题、暂停/继续、登录弹窗、移动端导航
// 选择器优先使用稳定 data-testid，避免与界面文案耦合；
// 计时类断言用 waitForFunction 轮询，避免固定 sleep 造成偶发失败。
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
await page.evaluate(() => localStorage.setItem('nonogram_intro_seen', '1'));
await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);

// 0) 侧边栏默认固定可见，供后续步骤直接操作
const panelTitle = page.locator('[data-testid="panel-title"]');
check('侧边栏默认可见', await panelTitle.isVisible());

// 1) 页面渲染
const rootLen = (await page.locator('#root').innerText()).length;
check('页面渲染', rootLen > 100, `root=${rootLen}`);

// 2) 计时器存在
const timer = page.locator('[data-testid="timer-text"]');
check('计时器存在', await timer.isVisible());
const t1 = (await timer.innerText()).trim();
check('新盘初始 00:00', t1 === '00:00', t1);

// 3) 未点击格子前不走秒
await page.waitForTimeout(2200);
const t2 = (await timer.innerText()).trim();
check('未点击不走秒', t1 === t2, `${t1} == ${t2}`);

// 4) 点击第一个格子后开始计时（轮询等待，不依赖固定 sleep）
const cell = page.locator('[data-cell][data-r="0"][data-c="0"]').first();
const box = await cell.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page
  .waitForFunction(
    () => /^00:0[1-9]$/.test(document.querySelector('[data-testid="timer-text"]')?.textContent || ''),
    { timeout: 6000 },
  )
  .catch(() => {});
const t3 = (await timer.innerText()).trim();
check('首击后开始计时', /^00:0[1-9]$/.test(t3), t3);

// 5) 暂停/继续
const pauseBtn = page.locator('[data-testid="timer-pause-btn"]');
check('暂停按钮存在', await pauseBtn.isVisible());
await pauseBtn.click();
await page.waitForTimeout(200);
const t4 = (await timer.innerText()).trim();
await page.waitForTimeout(1500);
const t5 = (await timer.innerText()).trim();
check('暂停不走秒', t4 === t5, `${t4} == ${t5}`);
await pauseBtn.click();

// 6) 注册/登录弹窗存在（未登录时，点侧边栏按钮打开）
const authBtn = page.locator('[data-testid="auth-open-btn"]');
check('登录按钮存在', await authBtn.isVisible());
await authBtn.click();
await page.waitForTimeout(300);
const hasLoginForm = await page.locator('[data-testid="auth-username"]').isVisible().catch(() => false);
check('登录弹窗可见', hasLoginForm);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// 7) 注册并导入一道 5x5 唯一解题，保证随机抽题能命中服务器题库
const email = `flow_${Date.now()}@test.local`;
const codeRes = await page.evaluate(async (mail) => {
  const r = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: mail, mode: 'register' }),
    credentials: 'include',
  });
  return r.json();
}, email);
const reg = await page.evaluate(async ({ username, password, mail, code }) => {
  const r = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email: mail, code }),
    credentials: 'include',
  });
  return r.json();
}, { username: `flow_${Date.now()}`, password: 'Password123!', mail: email, code: codeRes.devCode });
check('测试用户注册成功', !!reg.username);
const imported = await page.evaluate(async () => {
  const r = await fetch('/api/puzzles/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      puzzle: {
        rows: 5,
        cols: 5,
        rowCluesStr: ['1.1', '1.1.1', '1.1', '1.1', '1'],
        colCluesStr: ['2', '1.1', '1.1', '1.1', '2'],
        grid: [[0, 1, 0, 1, 0], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0]],
      },
    }),
    credentials: 'include',
  });
  return r.json();
});
check('题库导入 5x5 唯一解题', imported.results?.[0]?.ok === true, JSON.stringify(imported));

// 8) 随机抽题（棋盘设置区常驻显示，直接点随机按钮）：成功后应重置计时器
const randomBtn = page.locator('[data-testid="random-btn"]');
check('随机按钮存在', await randomBtn.isVisible());
await randomBtn.click();
await page
  .waitForFunction(
    () => document.querySelector('[data-testid="timer-text"]')?.textContent === '00:00',
    { timeout: 8000 },
  )
  .catch(() => {});
const timerAfterRandom = (await timer.innerText()).trim();
check('抽题后重置为 00:00 且不启动', timerAfterRandom === '00:00', timerAfterRandom);

// 9) 手机端底部导航（缩小视口）
await page.setViewportSize({ width: 420, height: 800 });
await page.waitForTimeout(500);
check('手机端底部导航存在', (await page.locator('[data-testid="nav-import"]').count()) > 0);

for (const r of results) console.log(r);
console.log(`\nJS 错误数: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);

await browser.close();
process.exit(errors.length > 0 || results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
