// 页面加载冒烟测试：无头浏览器打开应用，断言无 JS 错误
// 用法：先运行 npm run build 和 vite preview，再执行 node tests/e2e-load.mjs
import { chromium } from 'playwright';

const BASE = process.env.TEST_BASE || 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'msedge', headless: true, locale: 'zh-CN' });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}\n${e.stack || ''}`));
page.on('console', (m) => {
  // 忽略资源加载失败（如本地 preview 无后端时的 API 502），只关注 JS 运行时错误
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
    errors.push(`CONSOLE: ${m.text()}`);
  }
});

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

const title = await page.title();
console.log('页面标题:', title);
if (title !== 'Nonogram') errors.push(`TITLE: 期望"Nonogram"实际"${title}"`);
console.log('root 内容长度:', (await page.locator('#root').innerText()).length);
console.log('错误数:', errors.length);
for (const e of errors.slice(0, 10)) console.log(e);

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
