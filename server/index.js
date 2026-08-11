import './env.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import express from 'express';
import cookieParser from 'cookie-parser';
import { db } from './db.js';
import { fetchPageHtml } from './fetch-proxy.js';
import { createTrustProxyChecker } from './trust-proxy.js';
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
  validatePassword,
  validateEmail,
  sendEmailVerificationCode,
  verifyEmailCode,
  clearEmailCode,
  checkSendCodeLimits,
  recordEmailSent,
  recordAuthFailure,
  clearAuthFailures,
  recordSendViolation,
  cleanupAuthState,
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
  if (p.grid && !gridMatchesClues(p)) return { ok: false, reason: '题目答案与线索不一致' };

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
app.disable('x-powered-by');

// 只信任本机 Nginx 与 Cloudflare 边缘节点，其余 X-Forwarded-For 一律视为伪造。
// Node 已绑定 127.0.0.1，只有 Nginx 能连进来；Nginx 用 $proxy_add_x_forwarded_for
// 在右侧追加真实对端 IP，因此 req.ip 会取到真实客户端（经 Cloudflare 时取到 CF-Connecting-IP 对应地址）。
// Cloudflare 网段可用 CLOUDFLARE_IPS 环境变量覆盖（见 trust-proxy.js）。
app.set('trust proxy', createTrustProxyChecker());
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// 题库导入限流：唯一解校验是 CPU 密集路径，按用户（未登录按 IP）每小时 30 次。
// 说明：进程内存态，单实例部署够用；如需多实例可迁到数据库。
const importLimits = new Map();
const IMPORT_LIMIT_PER_HOUR = 30;
const importRateLimit = (req, res, next) => {
  const key = req.user?.id ? `u${req.user.id}` : `ip${req.ip || 'unknown'}`;
  const now = Date.now();
  const rec = importLimits.get(key);
  if (!rec || rec.resetAt < now) {
    importLimits.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return next();
  }
  rec.count += 1;
  if (rec.count > IMPORT_LIMIT_PER_HOUR) {
    return res.status(429).json({ error: msg(req, 'auth.rate_limited') });
  }
  next();
};

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
    recordAuthFailure(req.ip);
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
app.post('/api/auth/send-code', authRateLimit, async (req, res) => {
  const { email, mode = 'register' } = req.body || {};
  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: msg(req, emailErr) });
  const normalized = email.trim().toLowerCase();

  // 生产环境未配置邮件服务时 fail-closed：绝不降级为桩模式泄露验证码
  if (process.env.NODE_ENV === 'production' && isStubMailer) {
    return res.status(503).json({ error: msg(req, 'auth.email_not_configured') });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (mode === 'reset') {
    // 忘记密码：邮箱必须已注册
    if (!exists) return res.status(404).json({ error: msg(req, 'auth.email_not_found') });
  } else if (exists) {
    // 注册：邮箱必须未注册
    return res.status(409).json({ error: msg(req, 'auth.email_exists') });
  }

  // 滥用防护：IP 每小时上限 / 每邮箱每日上限 / 全局每日与每月额度
  const guard = checkSendCodeLimits(req, normalized);
  if (!guard.ok) {
    if (guard.reason === 'auth.send_too_many' || guard.reason === 'auth.code_too_frequent') {
      recordSendViolation(req.ip);
    }
    return res.status(429).json({ error: msg(req, guard.reason, guard.vars) });
  }

  const sent = sendEmailVerificationCode(normalized);
  if (!sent.ok) {
    recordSendViolation(req.ip);
    return res.status(429).json({ error: msg(req, sent.reason) });
  }
  // 发送验证码邮件（Resend；未配置 API Key 时自动降级为桩模式）
  try {
    await sendEmailCode(normalized, sent.code);
  } catch (e) {
    console.error('[mailer] 发送失败:', e);
    clearEmailCode(normalized);
    return res.status(502).json({ error: msg(req, 'auth.email_send_failed') });
  }
  recordEmailSent(normalized, req.ip);
  res.json({
    ok: true,
    // 测试模式（未接入真实邮件服务）下把验证码直接返回给前端，方便联调；接入后移除
    ...(isStubMailer ? { devCode: sent.code } : {}),
  });
});

// 忘记密码：验证邮箱验证码后重置密码，并强制下线所有旧会话
app.post('/api/auth/reset-password', authRateLimit, (req, res) => {
  const { email, code, newPassword } = req.body || {};
  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: msg(req, emailErr) });
  const passwordErr = validatePassword(newPassword);
  if (passwordErr) return res.status(400).json({ error: msg(req, passwordErr) });

  const normalized = email.trim().toLowerCase();
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(normalized);
  if (!user) return res.status(404).json({ error: msg(req, 'auth.email_not_found') });
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: msg(req, 'auth.code_required') });
  }
  if (!verifyEmailCode(normalized, code.trim())) {
    recordAuthFailure(req.ip);
    return res.status(400).json({ error: msg(req, 'auth.code_invalid') });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(newPassword),
    user.id,
  );
  // 安全：重置密码后使该用户所有会话失效
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  res.json({ ok: true });
});

app.post('/api/auth/login', authRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: msg(req, 'auth.credentials_required') });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordAuthFailure(req.ip);
    return res.status(401).json({ error: msg(req, 'auth.wrong_credentials') });
  }
  clearAuthFailures(req.ip);
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

  let where;
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

  let row;
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
app.post('/api/puzzles/import', requireAuth, importRateLimit, async (req, res) => {
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

/** 标记题目已完成：必须提交盘面，服务器校验与线索一致后记录 */
app.post('/api/puzzles/:id/complete', requireAuth, (req, res) => {
  const id = String(req.params.id || '');
  const row = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: msg(req, 'puzzle.not_found') });

  const grid = req.body?.grid;
  if (!Array.isArray(grid)) {
    return res.status(400).json({ error: msg(req, 'puzzle.grid_required') });
  }
  const p = normalizePuzzle({
    rows: row.rows,
    cols: row.cols,
    rowClues: JSON.parse(row.row_clues),
    colClues: JSON.parse(row.col_clues),
    grid,
  });
  if (!p || !gridMatchesClues(p)) {
    return res.status(400).json({ error: msg(req, 'puzzle.grid_mismatch') });
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

/** 网页源码抓取代理：让前端保持 connect-src 'self'，同时避免在浏览器里直连第三方 */
app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return res.status(400).json({ error: msg(req, 'puzzle.fetch_url_invalid') });
  }
  try {
    const html = await fetchPageHtml(url.trim());
    res.json({ ok: true, html });
  } catch (e) {
    const key = e?.i18nKey || 'puzzle.fetch_url_failed';
    res.status(400).json({ error: msg(req, key) });
  }
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

// 启动时清理过期会话、旧发送记录与认证状态（避免表无限增长）
try {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.prepare('DELETE FROM email_sends WHERE sent_at <= ?').run(now - 90 * 24 * 60 * 60 * 1000);
  cleanupAuthState();
} catch (e) {
  console.error('启动清理失败:', e);
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`nonogram API listening on :${PORT}`);
});
