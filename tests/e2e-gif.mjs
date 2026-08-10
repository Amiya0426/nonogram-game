// 复盘 GIF 测试：注入已解存档 -> 完成后出现"复盘GIF"按钮 -> 点击生成下载
// 用法：node tests/e2e-gif.mjs [BASE_URL]
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

// 已解 5x5（webpbn#304）：1=黑 0=白
const solved = {
  mode: 'play',
  rows: 5,
  cols: 5,
  rowCluesStr: ['1 1', '1 1 1', '1 1', '1 1', '1'],
  colCluesStr: ['2', '1\n1', '1\n1', '1\n1', '2'],
  grid: [
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  gameSettings: {},
  moveHistory: [
    { type: 'fill', cells: [{ r: 0, c: 1, val: 1 }, { r: 0, c: 3, val: 1 }] },
    { type: 'fill', cells: [{ r: 1, c: 0, val: 1 }, { r: 1, c: 2, val: 1 }, { r: 1, c: 4, val: 1 }] },
    { type: 'deduct', cells: [{ r: 2, c: 0, val: 1 }, { r: 2, c: 4, val: 1 }] },
    { type: 'restore', cells: [{ r: 3, c: 1, val: 1 }, { r: 3, c: 3, val: 1 }] },
    { type: 'fill', cells: [{ r: 4, c: 2, val: 1 }] },
    // 打叉：复盘 GIF 不显示叉，也不应生成帧
    { type: 'fill', cells: [{ r: 4, c: 4, val: 2 }] },
  ],
};

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate((save) => {
  localStorage.setItem('nonogram_master_save', JSON.stringify(save));
}, solved);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const gifBtn = page.getByTitle('生成这盘的复盘 GIF');
check('完成状态出现复盘GIF按钮', await gifBtn.isVisible());

const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
await gifBtn.click();
const download = await downloadPromise;
check('GIF 文件下载触发', !!download, download ? download.suggestedFilename() : '');

// 5 条黑块操作 + 1 条打叉（不生成帧）= 初始帧 + 5 + 完成帧 = 7 帧
const frameMsg = page.getByText(/复盘 GIF 已生成/);
await frameMsg.waitFor({ state: 'visible', timeout: 8000 });
check('帧数提示正确（打叉不生成帧）', (await frameMsg.textContent()).includes('7 帧'), await frameMsg.textContent());

for (const r of results) console.log(r);
console.log(`\nJS 错误数: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);

await browser.close();
process.exit(errors.length > 0 || results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
