import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import express from 'express';
import cookieParser from 'cookie-parser';
import { db } from './db.js';
import {
  normalizePuzzle,
  validatePuzzle,
  contentHash,
  puzzleIdFromHash,
  gridMatchesClues,
} from './puzzle-lib.js';
import {
  requireAuth,
  resolveUser,
  authRateLimit,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  hashPassword,
  verifyPassword,
  validateCredentials,
  validateEmail,
  sendEmailVerificationCode,
  verifyEmailCode,
} from './auth.js';
import { sendEmailCode, isStubMailer } from './mailer.js';
import { msg } from './i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, '..', 'dist');

/** 在 Worker 线程中做唯一解校验，避免同步求解阻塞事件循环 */
const runSolverInWorker = (puzzle, options) =>
  new Promise((resolve) => {
    const worker = new Worker(new URL('./solve-worker.mjs', import.meta.url), {
      workerData: { puzzle, options },
    });
    const guard = setTimeout(() => {
      worker.terminate().catch(() => {});
      resolve({ count: 0, timeout: true });
    }, (options?.timeoutMs ?? 4000) + 2000);
    worker.once('message', (result) => {
      clearTimeout(guard);
      resolve(result);
    });
    worker.once('error', () => {
      clearTimeout(guard);
      resolve({ count: 0, timeout: true });
    });
  });

/**
 * 校验并写入共享题库（带用户归属）。供导入接口与收藏夹保存共用：
 * 收藏/导入的题目都会按内容去重进入题库。
 * 返回 { ok, created?, id?, reason? }
 */
async function upsertPuzzleIntoLibrary(raw, userId) {
  const p = normalizePuzzle(raw);
  if (!p) return { ok: false, reason: '题目格式不正确' };
  const valid = validatePuzzle(p);
  if (!valid.ok) return { ok: false, reason: valid.reason };

  const hash = contentHash(p);
  const existing = db.prepare('SELECT * FROM puzzles WHERE content_hash = ?').get(hash);
  if (existing) return { ok: true, created: false, id: existing.id };

  let sol;
  try {
    sol = await runSolverInWorker(p, { timeoutMs: 4000, nodeLimit: 200000 });
  } catch {
    sol = { count: 0, timeout: true };
  }
  if (sol.timeout) return { ok: false, reason: '唯一解校验超时，暂无法入库' };
  if (sol.count === 0) return { ok: false, reason: '题目无解' };
  if (sol.count >= 2) return { ok: false, reason: '题目存在多个解，不符合唯一解要求' };

  const id = puzzleIdFromHash(hash);
  const blackCells = p.grid ? p.grid.flat().filter(Boolean).length : null;
  const density =
    blackCells !== null
      ? blackCells / (p.rows * p.cols)
      : (p.rowClues.reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0) +
          p.colClues.reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0)) /
        (2 * p.rows * p.cols);

  db.prepare(
    `INSERT INTO puzzles (id, rows, cols, row_clues, col_clues, grid, source, density, content_hash, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    p.rows,
    p.cols,
    JSON.stringify(p.rowClues),
    JSON.stringify(p.colClues),
    p.grid ? JSON.stringify(p.grid) : null,
    raw.source || 'import',
    Math.round(density * 1000) / 1000,
    hash,
    userId ?? null,
  );
  return { ok: true, created: true, id };
}

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ---------- 认证 ----------
app.post('/api/auth/register', authRateLimit, (req, res) => {
  const { username, password, email, code } = req.body || {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: msg(req, err) });
  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: msg(req, emailErr) });
  const normalizedEmail = email.trim().toLowerCase();

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: msg(req, 'auth.user_exists') });
  const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (emailExists) return res.status(409).json({ error: msg(req, 'auth.email_exists') });
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: msg(req, 'auth.code_required') });
  }
  if (!verifyEmailCode(normalizedEmail, code.trim())) {
    return res.status(400).json({ error: msg(req, 'auth.code_invalid') });
  }

  const info = db
    .prepare('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)')
    .run(username, hashPassword(password), normalizedEmail);
  const token = createSession(Number(info.lastInsertRowid));
  setSessionCookie(res, token);
  res.json({ id: Number(info.lastInsertRowid), username });
});

// 邮箱验证码（搭架子）：生成验证码并通过 mailer 占位发送
app.post('/api/auth/send-code', authRateLimit, (req, res) => {
  const { email } = req.body || {};
  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: msg(req, emailErr) });
  const normalized = email.trim().toLowerCase();

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (exists) return res.status(409).json({ error: msg(req, 'auth.email_exists') });

  const sent = sendEmailVerificationCode(normalized);
  if (!sent.ok) {
    return res.status(429).json({ error: msg(req, sent.reason) });
  }
  // 占位发送：真实邮件服务接入后此调用会真正发信
  sendEmailCode(normalized, sent.code).catch((e) =>
    console.error('[mailer] 发送失败:', e),
  );
  res.json({
    ok: true,
    // 测试模式（未接入真实邮件服务）下把验证码直接返回给前端，方便联调；接入后移除
    ...(isStubMailer ? { devCode: sent.code } : {}),
  });
});

app.post('/api/auth/login', authRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: msg(req, 'auth.credentials_required') });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: msg(req, 'auth.wrong_credentials') });
  }
  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json({ id: user.id, username: user.username });
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(req.cookies?.sid);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// ---------- 题库 ----------

const puzzleRowToDto = (row) => ({
  id: row.id,
  rows: row.rows,
  cols: row.cols,
  rowCluesStr: JSON.parse(row.row_clues).map((arr) => arr.join('.')),
  colCluesStr: JSON.parse(row.col_clues).map((arr) => arr.join('.')),
  source: row.source,
  density: row.density,
  user_id: row.user_id ?? null,
  contributor: row.contributor ?? null,
  name: row.name ?? null,
  completed: !!row.completed,
});

const numParam = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

/** 随机抽题：?rows=&cols= 精确，或 ?minRows=&maxRows=&minCols=&maxCols= 范围 */
app.get('/api/puzzles/random', resolveUser, (req, res) => {
  const q = req.query;
  const rows = numParam(q.rows);
  const cols = numParam(q.cols);
  const minRows = numParam(q.minRows);
  const maxRows = numParam(q.maxRows);
  const minCols = numParam(q.minCols);
  const maxCols = numParam(q.maxCols);

  let where = '';
  const params = [];
  if (rows !== null && cols !== null) {
    where = 'WHERE rows = ? AND cols = ?';
    params.push(rows, cols);
  } else {
    const rMin = minRows ?? 3;
    const rMax = maxRows ?? 80;
    const cMin = minCols ?? 3;
    const cMax = maxCols ?? 80;
    where = 'WHERE rows BETWEEN ? AND ? AND cols BETWEEN ? AND ?';
    params.push(rMin, rMax, cMin, cMax);
  }

  const excludeCompleted = q.excludeCompleted === '1' && req.user;
  const uid = req.user?.id;

  let row = null;
  if (excludeCompleted) {
    row = db
      .prepare(
        `SELECT p.*, u.username AS contributor FROM puzzles p
         LEFT JOIN users u ON u.id = p.user_id
         ${where}
         AND NOT EXISTS (SELECT 1 FROM user_progress up
                         WHERE up.puzzle_id = p.id AND up.user_id = ?)
         ORDER BY RANDOM() LIMIT 1`,
      )
      .get(...params, uid);
    if (!row) {
      row = db
        .prepare(
          `SELECT p.*, u.username AS contributor FROM puzzles p
           LEFT JOIN users u ON u.id = p.user_id
           ${where} ORDER BY RANDOM() LIMIT 1`,
        )
        .get(...params);
    }
  } else {
    row = db
      .prepare(
        `SELECT p.*, u.username AS contributor FROM puzzles p
         LEFT JOIN users u ON u.id = p.user_id
         ${where} ORDER BY RANDOM() LIMIT 1`,
      )
      .get(...params);
  }

  if (!row) return res.status(404).json({ error: msg(req, 'puzzle.none') });
  res.json(puzzleRowToDto(row));
});

/** 题库浏览：分页返回题目列表，登录用户附带是否已完成 */
app.get('/api/puzzles', resolveUser, (req, res) => {
  const q = req.query;
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(q.perPage, 10) || 30));
  const rows = numParam(q.rows);
  const cols = numParam(q.cols);
  const minRows = numParam(q.minRows) ?? 3;
  const maxRows = numParam(q.maxRows) ?? 80;
  const minCols = numParam(q.minCols) ?? 3;
  const maxCols = numParam(q.maxCols) ?? 80;

  const mine = q.mine === '1' && req.user;
  const done = q.done === '1' && req.user;

  // 需要登录的筛选（我导入的/已完成）未登录时直接返回空
  if ((q.mine === '1' || q.done === '1') && !req.user) {
    return res.json({ items: [], total: 0, page, perPage });
  }

  let where = 'WHERE 1=1';
  const params = [];
  if (rows !== null && cols !== null) {
    where += ' AND p.rows = ? AND p.cols = ?';
    params.push(rows, cols);
  } else {
    where += ' AND p.rows BETWEEN ? AND ? AND p.cols BETWEEN ? AND ?';
    params.push(minRows, maxRows, minCols, maxCols);
  }
  if (mine) {
    where += ' AND p.user_id = ?';
    params.push(req.user.id);
  }
  if (done) {
    where +=
      ' AND EXISTS (SELECT 1 FROM user_progress up2 WHERE up2.puzzle_id = p.id AND up2.user_id = ?)';
    params.push(req.user.id);
  }

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM puzzles p ${where}`)
    .get(...params).n;
  const items = db
    .prepare(
      `SELECT p.*, u.username AS contributor,
              CASE WHEN up.user_id IS NULL THEN 0 ELSE 1 END AS completed
       FROM puzzles p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN user_progress up ON up.puzzle_id = p.id AND up.user_id = ?
       ${where}
       ORDER BY p.created_at DESC, p.id
       LIMIT ? OFFSET ?`,
    )
    .all(req.user?.id ?? -1, ...params, perPage, (page - 1) * perPage);

  res.json({
    items: items.map(puzzleRowToDto),
    total,
    page,
    perPage,
  });
});

/** 导入题目：{ puzzle } 或 { puzzles: [...] }；校验合法且唯一解后入库（自动去重） */
app.post('/api/puzzles/import', requireAuth, async (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.puzzles)
    ? body.puzzles
    : body.puzzle
      ? [body.puzzle]
      : [];
  if (!items.length) return res.status(400).json({ error: msg(req, 'puzzle.import_empty') });
  if (items.length > 200) return res.status(400).json({ error: msg(req, 'puzzle.import_too_many') });

  const results = [];
  const startedAt = Date.now();
  const TOTAL_BUDGET_MS = 30000;

  for (let i = 0; i < items.length; i++) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) {
      results.push({ index: i, ok: false, reason: msg(req, 'puzzle.batch_timeout') });
      continue;
    }
    const lib = await upsertPuzzleIntoLibrary(items[i], req.user.id);
    results.push(
      lib.ok
        ? { index: i, ok: true, created: lib.created, id: lib.id }
        : { index: i, ok: false, reason: msg(req, lib.reason) },
    );
  }

  const okCount = results.filter((r) => r.ok).length;
  res.json({ results, imported: okCount });
});

/** 修改自己导入的题目名称 */
app.put('/api/puzzles/:id/name', requireAuth, (req, res) => {
  const id = String(req.params.id || '');
  const row = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: msg(req, 'puzzle.not_found') });
  if (row.user_id !== req.user.id) {
    return res.status(403).json({ error: msg(req, 'puzzle.rename_forbidden') });
  }
  const { name } = req.body || {};
  const newName =
    typeof name === 'string' && name.trim() ? name.trim().slice(0, 100) : null;
  db.prepare('UPDATE puzzles SET name = ? WHERE id = ?').run(newName, id);
  res.json({ ok: true, id, name: newName });
});

/** 标记题目已完成（可选提交盘面，服务器用答案校验） */
app.post('/api/puzzles/:id/complete', requireAuth, (req, res) => {
  const id = String(req.params.id || '');
  const row = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: msg(req, 'puzzle.not_found') });

  const grid = req.body?.grid;
  if (grid) {
    const p = normalizePuzzle({
      rows: row.rows,
      cols: row.cols,
      rowClues: JSON.parse(row.row_clues),
      colClues: JSON.parse(row.col_clues),
      grid,
    });
    const stored = p ? gridMatchesClues(p) : false;
    const answer = row.grid ? JSON.parse(row.grid) : null;
    const matchesAnswer = answer ? JSON.stringify(answer) === JSON.stringify(grid) : false;
    if (!stored && !matchesAnswer) {
      return res.status(400).json({ error: msg(req, 'puzzle.grid_mismatch') });
    }
  }

  db.prepare(
    `INSERT INTO user_progress (user_id, puzzle_id) VALUES (?, ?)
     ON CONFLICT(user_id, puzzle_id) DO NOTHING`,
  ).run(req.user.id, id);
  res.json({ ok: true, id });
});

/** 当前用户已完成题目 ID 列表 */
app.get('/api/user/progress', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT up.puzzle_id AS id, p.rows, p.cols, up.completed_at AS completedAt
       FROM user_progress up LEFT JOIN puzzles p ON p.id = up.puzzle_id
       WHERE up.user_id = ?
       ORDER BY up.completed_at DESC`,
    )
    .all(req.user.id);
  res.json(rows);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ---------- 静态托管（直连 Express 时可用；生产走 Nginx） ----------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  const indexHtml = path.join(DIST_DIR, 'index.html');
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    next();
  });
}

app.use((req, res) => {
  res.status(404).json({ error: msg(req, 'api.not_found') });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: msg(req, 'api.internal_error') });
});

app.listen(PORT, () => {
  console.log(`nonogram API listening on :${PORT}`);
});
