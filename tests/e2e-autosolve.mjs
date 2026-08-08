// 一键解题不计入解题记录：autoSolve 后 user_progress 不应包含该题
// 用法：node tests/e2e-autosolve.mjs [BASE_URL]
import { chromium } from 'playwright';

const BASE = process.argv[2] || process.env.TEST_BASE || 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
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

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });

// 1) 注册新用户（同源 API，带 cookie）
const uname = `auto_${Date.now()}`;
const reg = await page.evaluate(async (u) => {
  const r = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: 'password123' }),
    credentials: 'include',
  });
  return r.json();
}, uname);
check('注册成功', !!reg.username);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// 2) 从服务器拿一道题，注入存档（currentPuzzleId 恢复），刷新加载
const puzzle = await page.evaluate(async () => {
  const r = await fetch('/api/puzzles/random?rows=5&cols=5', { credentials: 'include' });
  return r.json();
});
const emptyGrid = Array.from({ length: puzzle.rows }, () => new Array(puzzle.cols).fill(0));
await page.evaluate(({ p, grid }) => {
  const save = {
    mode: 'play',
    rows: p.rows,
    cols: p.cols,
    rowCluesStr: p.rowCluesStr,
    colCluesStr: p.colCluesStr,
    grid,
    currentPuzzleId: p.id,
    timerRunning: true,
    gameSettings: {},
  };
  localStorage.setItem('nonogram_master_save', JSON.stringify(save));
}, { p: puzzle, grid: emptyGrid });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// 3) 一键解题
await page.getByRole('button', { name: '一键解题' }).click();
await page.waitForTimeout(2000);

// 4) 一键解题执行后无报错（部分题需试错，可能不会立即进入完成状态，此处只验证不崩溃）
check('一键解题执行无报错', errors.length === 0);

// 5) 进度接口不应包含自动解的题
const progress = await page.evaluate(async () => {
  const r = await fetch('/api/user/progress', { credentials: 'include' });
  return r.json();
});
check('一键解题不计入解题记录', Array.isArray(progress) && progress.length === 0,
  `progress=${JSON.stringify(progress)}`);

// 6) 对照：手动调用 complete 接口应能正常记录（验证记录机制本身没坏）
const comp = await page.evaluate(async (id) => {
  const r = await fetch(`/api/puzzles/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });
  return r.json();
}, puzzle.id);
const progress2 = await page.evaluate(async () => {
  const r = await fetch('/api/user/progress', { credentials: 'include' });
  return r.json();
});
check('手动完成可正常记录', Array.isArray(progress2) && progress2.length === 1,
  `progress=${JSON.stringify(progress2)}`);

for (const r of results) console.log(r);
console.log(`\nJS 错误数: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);

await browser.close();
process.exit(errors.length > 0 || results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
