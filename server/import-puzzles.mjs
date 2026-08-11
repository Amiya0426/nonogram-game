/**
 * 将 build-puzzle-db.mjs 生成的 import.jsonl 导入 puzzles 表。
 * 逐题校验合法性与唯一解，非唯一解/无解/超时/答案不符的题目一律跳过，
 * 保证服务器只保留唯一解题目（不依赖上游文件可信度）。
 *
 * 用法：
 *   node server/import-puzzles.mjs <import.jsonl 路径>
 *   （可指定 DATA_DIR 环境变量以导入到指定数据库）
 */
import fs from 'node:fs';
import { db } from './db.js';
import { validatePuzzle, gridMatchesClues, countSolutions } from './puzzle-lib.js';

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error('用法: node server/import-puzzles.mjs <import.jsonl>');
  process.exit(1);
}

const lines = fs.readFileSync(input, 'utf8').split('\n').filter(Boolean);
const insert = db.prepare(
  `INSERT OR IGNORE INTO puzzles
   (id, rows, cols, row_clues, col_clues, grid, source, density, content_hash)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

let inserted = 0;
let skipped = 0;
let invalid = 0;
let multi = 0;
let noSolution = 0;
let timeout = 0;
let gridMismatch = 0;
const puzzles = lines.map((l) => JSON.parse(l));
db.exec('BEGIN');
try {
  for (const row of puzzles) {
    const p = {
      rows: row.rows,
      cols: row.cols,
      rowClues: row.row_clues,
      colClues: row.col_clues,
      grid: row.grid ?? null,
    };
    if (!validatePuzzle(p).ok) {
      invalid++;
      continue;
    }
    if (p.grid && !gridMatchesClues(p)) {
      gridMismatch++;
      continue;
    }
    const sol = countSolutions(p, { timeoutMs: 4000, nodeLimit: 200000 });
    if (sol.timeout) {
      timeout++;
      continue;
    }
    if (sol.count === 0) {
      noSolution++;
      continue;
    }
    if (sol.count >= 2) {
      multi++;
      continue;
    }
    const info = insert.run(
      row.id,
      row.rows,
      row.cols,
      JSON.stringify(row.row_clues),
      JSON.stringify(row.col_clues),
      row.grid ? JSON.stringify(row.grid) : null,
      row.source,
      row.density,
      row.content_hash,
    );
    if (info.changes > 0) inserted++;
    else skipped++;
  }
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}
const total = db.prepare('SELECT COUNT(*) AS n FROM puzzles').get().n;
console.log(
  `导入完成：新增 ${inserted}，跳过重复 ${skipped}，无效 ${invalid}，无解 ${noSolution}，多解 ${multi}，超时 ${timeout}，答案不符 ${gridMismatch}，题库现有 ${total} 题`,
);
