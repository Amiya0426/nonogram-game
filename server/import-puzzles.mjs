/**
 * 将 build-puzzle-db.mjs 生成的 import.jsonl 导入 puzzles 表。
 *
 * 用法：
 *   node server/import-puzzles.mjs <import.jsonl 路径>
 *   （可指定 DATA_DIR 环境变量以导入到指定数据库）
 */
import fs from 'node:fs';
import { db } from './db.js';

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
const puzzles = lines.map((l) => JSON.parse(l));
db.exec('BEGIN');
try {
  for (const row of puzzles) {
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
console.log(`导入完成：新增 ${inserted}，跳过重复 ${skipped}，题库现有 ${total} 题`);
