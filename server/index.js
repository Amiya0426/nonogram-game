import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { db } from './db.js';
import {
  requireAuth,
  authRateLimit,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  hashPassword,
  verifyPassword,
  validateCredentials,
} from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, '..', 'dist');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ---------- 认证 ----------
app.post('/api/auth/register', authRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '用户名已存在，请直接登录' });

  const info = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, hashPassword(password));
  const token = createSession(Number(info.lastInsertRowid));
  setSessionCookie(res, token);
  res.json({ id: Number(info.lastInsertRowid), username });
});

app.post('/api/auth/login', authRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
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

// ---------- 收藏夹 ----------
const rowToItem = (row) => {
  const puzzle = JSON.parse(row.puzzle_json || '{}');
  return {
    id: row.id,
    name: row.name,
    date: row.created_at,
    ...puzzle,
  };
};

app.get('/api/collections', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json(rows.map(rowToItem));
});

app.post('/api/collections', requireAuth, (req, res) => {
  const { name, puzzle } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ error: '收藏名称不合法' });
  }
  if (!puzzle || typeof puzzle !== 'object') {
    return res.status(400).json({ error: '收藏内容不合法' });
  }
  const info = db
    .prepare(
      'INSERT INTO collections (user_id, name, puzzle_json) VALUES (?, ?, ?)',
    )
    .run(req.user.id, name.trim(), JSON.stringify(puzzle));
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(Number(info.lastInsertRowid));
  res.json(rowToItem(row));
});

app.put('/api/collections/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare('SELECT * FROM collections WHERE id = ? AND user_id = ?')
    .get(id, req.user.id);
  if (!row) return res.status(404).json({ error: '收藏不存在' });

  const { name, puzzle } = req.body || {};
  const newName = typeof name === 'string' && name.trim() ? name.trim() : row.name;
  const newPuzzle =
    puzzle && typeof puzzle === 'object' ? JSON.stringify(puzzle) : row.puzzle_json;
  db.prepare(
    `UPDATE collections SET name = ?, puzzle_json = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
  ).run(newName, newPuzzle, id, req.user.id);
  const updated = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  res.json(rowToItem(updated));
});

app.delete('/api/collections/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db
    .prepare('DELETE FROM collections WHERE id = ? AND user_id = ?')
    .run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: '收藏不存在' });
  res.json({ ok: true });
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
  res.status(404).json({ error: '接口不存在' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`nonogram API listening on :${PORT}`);
});
