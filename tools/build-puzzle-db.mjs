/**
 * 将 tools/puzzle-data/merged/*.jsonl 构建为服务器可导入的题库文件。
 *
 * 流程：合法性校验 -> 唯一解判定 -> 生成数字 ID 与内容指纹 -> 输出 import.jsonl
 * 只保留有唯一解的题目（多解 / 无解 / 校验超时都会被剔除）。
 *
 * 用法：
 *   node tools/build-puzzle-db.mjs [数据目录] [输出文件]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizePuzzle,
  validatePuzzle,
  contentHash,
  puzzleIdFromHash,
  countSolutions,
} from '../server/puzzle-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(process.argv[2] || path.join(__dirname, 'puzzle-data', 'merged'));
const OUT = path.resolve(process.argv[3] || path.join(__dirname, 'puzzle-data', 'import.jsonl'));

const start = Date.now();
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.jsonl')).sort();
console.error(`数据目录: ${SRC}`);
console.error(`文件数: ${files.length}，前 5: ${files.slice(0, 5).join(', ')}`);
let total = 0;
let invalid = 0;
let noSolution = 0;
let multiSolution = 0;
let timeout = 0;
let unique = 0;
const bySize = new Map();

const outItems = [];
fs.writeFileSync(OUT, ''); // 清空输出文件（同步）

for (const file of files) {
  const dim = file.replace('.jsonl', '');
  const fileStart = Date.now();
  const lines = fs.readFileSync(path.join(SRC, file), 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    let raw;
    try {
      raw = JSON.parse(line);
    } catch {
      continue;
    }
    total++;
    const p = normalizePuzzle(raw);
    if (!p) { invalid++; continue; }
    const valid = validatePuzzle(p);
    if (!valid.ok) { invalid++; continue; }

    // 批量构建：良构题（逻辑可解）秒判唯一解；需深度试错的题跳过
    const sol = countSolutions(p, { timeoutMs: 800, nodeLimit: 100000 });
    if (sol.timeout) { timeout++; continue; }
    if (sol.count === 0) { noSolution++; continue; }
    if (sol.count >= 2) { multiSolution++; continue; }

    const hash = contentHash(p);
    const id = puzzleIdFromHash(hash);
    const blackCells = p.grid ? p.grid.flat().filter(Boolean).length : null;
    const density =
      blackCells !== null
        ? blackCells / (p.rows * p.cols)
        : (p.rowClues.reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0) +
            p.colClues.reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0)) /
          (2 * p.rows * p.cols);

    outItems.push({
      id,
      rows: p.rows,
      cols: p.cols,
      row_clues: p.rowClues,
      col_clues: p.colClues,
      grid: p.grid,
      source: raw.source || 'unknown',
      density: Math.round(density * 1000) / 1000,
      content_hash: hash,
    });
    if (outItems.length >= 1000) {
      fs.appendFileSync(OUT, outItems.map((it) => JSON.stringify(it)).join('\n') + '\n');
      outItems.length = 0;
    }
    unique++;
    const key = `${p.cols}x${p.rows}`;
    bySize.set(key, (bySize.get(key) || 0) + 1);
    if (unique % 500 === 0) {
      process.stdout.write(`[${new Date().toISOString()}] 唯一解 ${unique} 题，当前文件 ${file}\n`);
    }
  }
  console.error(`文件 ${file}: ${lines.length} 题，耗时 ${Date.now() - fileStart}ms`);
}

if (outItems.length) {
  fs.appendFileSync(OUT, outItems.map((it) => JSON.stringify(it)).join('\n') + '\n');
  outItems.length = 0;
}
console.log(`处理 ${total} 题`);
console.log(`  非法格式/线索: ${invalid}`);
console.log(`  无解: ${noSolution}`);
console.log(`  多解: ${multiSolution}`);
console.log(`  校验超时: ${timeout}`);
console.log(`  唯一解入库: ${unique}`);
console.log('--- 各尺寸入库数量（前 20）---');
[...bySize.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log(`用时 ${((Date.now() - start) / 1000).toFixed(1)}s，输出 ${OUT}`);
