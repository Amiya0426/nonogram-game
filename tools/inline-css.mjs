// 构建后把主样式表内联进 index.html，消除渲染阻塞的 CSS 请求（移动端收益明显）。
// 用法：vite build 之后执行 node tools/inline-css.mjs
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const indexHtml = readFileSync(indexHtmlPath, 'utf8');

const linkRe = /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/;
const m = indexHtml.match(linkRe);
if (!m) {
  console.log('inline-css: 未找到主样式表链接，跳过');
  process.exit(0);
}

const cssPath = path.join(distDir, m[1].replace(/^\//, ''));
let css = readFileSync(cssPath, 'utf8');
// 防止 CSS 内容中出现 `</style>` 提前闭合
css = css.replace(/<\//g, '<\\/');

const html = indexHtml.replace(m[0], `<style>\n${css}\n</style>`);
writeFileSync(indexHtmlPath, html);
rmSync(cssPath);
console.log(`inline-css: 已内联 ${m[1]} (${css.length} bytes)`);
