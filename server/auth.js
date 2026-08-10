import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export const COOKIE_NAME = 'sid';

export const createSession = (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
  ).run(token, userId, Date.now() + SESSION_MS);
  return token;
};

export const destroySession = (token) => {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
};

export const setSessionCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !!process.env.SECURE_COOKIE,
    path: '/',
    maxAge: SESSION_MS,
  });
};

export const clearSessionCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
};

/** 登录态中间件：验证会话，注入 req.user */
export const requireAuth = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: '未登录' });
  const row = db
    .prepare(
      `SELECT s.user_id AS id, u.username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now());
  if (!row) return res.status(401).json({ error: '会话已过期，请重新登录' });
  req.user = row;
  next();
};

/** 可选登录：会话有效则注入 req.user，未登录也放行（用于公开接口按需排除已完成题） */
export const resolveUser = (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const row = db
      .prepare(
        `SELECT s.user_id AS id, u.username
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > ?`,
      )
      .get(token, Date.now());
    if (row) req.user = row;
  }
  next();
};

/** 登录/注册接口的简单内存限流：每 IP 15 分钟内最多 20 次尝试 */
const attempts = new Map();
export const authRateLimit = (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return next();
  }
  rec.count += 1;
  if (rec.count > 20) {
    return res.status(429).json({ error: '尝试次数过多，请 15 分钟后再试' });
  }
  next();
};

export const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);

export const validateCredentials = (username, password) => {
  if (typeof username !== 'string' || !/^[\w\u4e00-\u9fa5-]{2,32}$/.test(username)) {
    return '用户名需为 2-32 位字母、数字、下划线或中文';
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
    return '密码长度需为 6-72 位';
  }
  return null;
};
