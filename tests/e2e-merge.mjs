// 本地收藏合并云端测试：同名同尺寸但内容不同的本地收藏不应丢失
// 用法：node tests/e2e-merge.mjs [BASE_URL]
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

const uname = `merge_${Date.now()}`;
await page.evaluate(async (u) => {
  await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: 'password123' }),
    credentials: 'include',
  });
}, uname);

// 云端已有：name='同款' 5x5 内容 A
const itemA = {
  name: '同款', rows: 5, cols: 5,
  rowCluesStr: ['1 1', '1 1 1', '1 1', '1 1', '1'],
  colCluesStr: ['2', '1 1', '1 1', '1 1', '2'],
  grid: [[0, 1, 0, 1, 0], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0]],
};
await page.evaluate(async (item) => {
  await fetch('/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: item.name, puzzle: item }),
    credentials: 'include',
  });
}, itemA);

// 本地：同名同尺寸但内容 B 不同
const itemB = {
  name: '同款', rows: 5, cols: 5,
  rowCluesStr: ['1 1', '1 1', '1 1', '0', '0'],
  colCluesStr: ['3', '0', '3', '0', '0'],
  grid: [[1, 0, 1, 0, 0], [1, 0, 1, 0, 0], [1, 0, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
};
await page.evaluate((item) => {
  localStorage.setItem(
    'nonogram_collection',
    JSON.stringify([{ id: 1, name: item.name, ...item }]),
  );
}, itemB);

// 刷新：登录态恢复时自动合并本地收藏
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);

const cloud = await page.evaluate(async () => {
  const r = await fetch('/api/collections', { credentials: 'include' });
  return r.json();
});
check(
  '合并后云端包含同名不同内容的两个收藏',
  Array.isArray(cloud) && cloud.length === 2,
  `count=${Array.isArray(cloud) ? cloud.length : 'N/A'}`,
);
const hasB =
  Array.isArray(cloud) &&
  cloud.some((c) => JSON.stringify(c.grid) === JSON.stringify(itemB.grid));
check('本地内容B未被丢弃', hasB);
check(
  '云端收藏均关联题库',
  Array.isArray(cloud) && cloud.length > 0 && cloud.every((c) => !!c.puzzle_id),
  `ids=${Array.isArray(cloud) ? cloud.map((c) => c.puzzle_id).join(',') : 'N/A'}`,
);

const localAfter = await page.evaluate(() => localStorage.getItem('nonogram_collection'));
check('同步成功后本地收藏已清空', !localAfter || localAfter === '[]', `local=${localAfter}`);

for (const r of results) console.log(r);
console.log(`\nJS 错误数: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);

await browser.close();
process.exit(errors.length > 0 || results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
