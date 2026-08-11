/**
 * 审计/清理题库：确保服务器只保留唯一解题目。
 *
 * 用法：
 *   node server/audit-unique.mjs                # 只审计，输出统计与进度
 *   node server/audit-unique.mjs --fix          # 审计后删除非唯一解/无解/超时/答案不符的题目
 *   node server/audit-unique.mjs --no-progress  # 关闭进度输出（适合 CI）
 *   node server/audit-unique.mjs --apply-ids <ids.json>  # 仅按 ID 列表删除（不求解，供低配服务器使用）
 *   DATA_DIR=... 可指定数据库
 *
 * 删除题目时：
 *   - user_progress 通过外键 ON DELETE CASCADE 级联删除
 *   - collections.puzzle_id 通过 ON DELETE SET NULL 置空
 */
import fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import { db } from './db.js';
import { validatePuzzle, gridMatchesClues } from './puzzle-lib.js';

const FIX = process.argv.includes('--fix');
const NO_PROGRESS = process.argv.includes('--no-progress');
const APPLY_IDS_IDX = process.argv.indexOf('--apply-ids');
const APPLY_IDS = APPLY_IDS_IDX >= 0 ? process.argv[APPLY_IDS_IDX + 1] : undefined;
const CONCURRENCY = 8;
const TIMEOUT_MS = 4000;
const NODE_LIMIT = 200000;

const solve = (puzzle) =>
  new Promise((resolve) => {
    const worker = new Worker(new URL('./solve-worker.mjs', import.meta.url), {
      workerData: { puzzle, options: { timeoutMs: TIMEOUT_MS, nodeLimit: NODE_LIMIT } },
    });
    const guard = setTimeout(() => {
      worker.terminate().catch(() => {});
      resolve({ count: 0, timeout: true });
    }, TIMEOUT_MS + 2000);
    worker.once('message', (result) => {
      clearTimeout(guard);
      resolve(result);
    });
    worker.once('error', () => {
      clearTimeout(guard);
      resolve({ count: 0, timeout: true });
    });
  });

async function main() {
  // 仅按 ID 列表删除：不求解，适合把本地审计出的坏题列表拿到低配服务器上执行
  if (APPLY_IDS) {
    const ids = JSON.parse(fs.readFileSync(APPLY_IDS, 'utf8'));
    const del = db.prepare('DELETE FROM puzzles WHERE id = ?');
    let removed = 0;
    db.exec('BEGIN');
    try {
      for (const id of ids) {
        const info = del.run(id);
        if (info.changes > 0) removed++;
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    const left = db.prepare('SELECT COUNT(*) AS n FROM puzzles').get().n;
    console.log(`按列表删除 ${removed}/${ids.length} 题，题库剩余 ${left} 题`);
    return;
  }

  const rows = db
    .prepare('SELECT id, rows, cols, row_clues, col_clues, grid, source FROM puzzles')
    .all();
  const stats = { total: rows.length, ok: 0, multi: 0, none: 0, timeout: 0, invalid: 0, gridMismatch: 0 };
  const badIds = [];

  // 预过滤：格式非法 / 答案与线索不符
  const todo = [];
  for (const row of rows) {
    const p = {
      rows: row.rows,
      cols: row.cols,
      rowClues: JSON.parse(row.row_clues),
      colClues: JSON.parse(row.col_clues),
      grid: row.grid ? JSON.parse(row.grid) : null,
    };
    if (!validatePuzzle(p).ok) {
      stats.invalid++;
      badIds.push(row.id);
      continue;
    }
    if (p.grid && !gridMatchesClues(p)) {
      stats.gridMismatch++;
      badIds.push(row.id);
      continue;
    }
    todo.push({ id: row.id, p });
  }

  // 并行求解校验唯一解
  let idx = 0;
  let doneCount = 0;
  const startedAt = Date.now();
  const progressTimer = NO_PROGRESS
    ? null
    : setInterval(() => {
        const pct = todo.length ? Math.round((doneCount / todo.length) * 100) : 100;
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        process.stdout.write(
          `\r进度 ${doneCount}/${todo.length} (${pct}%) | 唯一解 ${stats.ok} | 多解 ${stats.multi} | 无解 ${stats.none} | 超时 ${stats.timeout} | 待清理 ${badIds.length} | 用时 ${elapsed}s`,
        );
      }, 2000);
  const runWorker = async () => {
    while (idx < todo.length) {
      const item = todo[idx++];
      const r = await solve(item.p);
      doneCount++;
      if (r.timeout) {
        stats.timeout++;
        badIds.push(item.id);
      } else if (r.count === 1) {
        stats.ok++;
      } else {
        if (r.count === 0) stats.none++;
        else stats.multi++;
        badIds.push(item.id);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, Math.max(1, todo.length)) }, () => runWorker()),
  );
  if (progressTimer) clearInterval(progressTimer);
  if (!NO_PROGRESS) process.stdout.write('\n');

  console.log(`审计结果：${JSON.stringify(stats)}`);
  console.log(`待清理：${badIds.length} 题`);

  if (FIX && badIds.length > 0) {
    const del = db.prepare('DELETE FROM puzzles WHERE id = ?');
    db.exec('BEGIN');
    try {
      for (const id of badIds) del.run(id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    const left = db.prepare('SELECT COUNT(*) AS n FROM puzzles').get().n;
    console.log(`已删除 ${badIds.length} 题，题库剩余 ${left} 题`);
  } else if (FIX) {
    console.log('无需清理');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
