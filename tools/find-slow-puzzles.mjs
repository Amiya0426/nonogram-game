/**
 * 扫描题库找出求解超时/卡死的题目，输出到 slow-puzzles.txt
 * 用法：node tools/find-slow-puzzles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePuzzle, countSolutions } from '../server/puzzle-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'puzzle-data', 'merged');
const OUT = path.join(__dirname, 'slow-puzzles.txt');

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.jsonl')).sort();
const slow = [];
const t0 = Date.now();
let total = 0;

for (const file of files) {
  const lines = fs.readFileSync(path.join(SRC, file), 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    let raw;
    try { raw = JSON.parse(line); } catch { continue; }
    const p = normalizePuzzle(raw);
    if (!p) continue;
    total++;
    const s = Date.now();
    const sol = countSolutions(p, { timeoutMs: 500, nodeLimit: 50000 });
    const dt = Date.now() - s;
    if (dt > 3000) {
      slow.push(`${file} | ${raw.source || '?'} | ${dt}ms | count=${sol.count} timeout=${sol.timeout}`);
      fs.appendFileSync(OUT, slow[slow.length - 1] + '\n');
      process.stdout.write(`SLOW: ${slow[slow.length - 1]}\n`);
    }
    if (total % 500 === 0) {
      process.stdout.write(`进度 ${total} 题，${((Date.now() - t0) / 1000).toFixed(0)}s，慢题 ${slow.length}\n`);
    }
  }
}
fs.writeFileSync(OUT, slow.join('\n'));
console.log(`\n完成：${total} 题，${slow.length} 道超 3 秒，结果 ${OUT}`);
