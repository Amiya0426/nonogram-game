import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { msg } from './i18n.js';

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
  if (!token) return res.status(401).json({ error: msg(req, 'auth.unauthorized') });
  const row = db
    .prepare(
      `SELECT s.user_id AS id, u.username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now());
  if (!row) return res.status(401).json({ error: msg(req, 'auth.session_expired') });
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

/** 登录/注册接口的简单内存限流：每 IP 30 分钟内最多 10 次尝试 */
const attempts = new Map();
export const authRateLimit = (req, res, next) => {
  const ip = req.ip || 'unknown';
  const banMs = getBanRemainingMs(ip);
  if (banMs > 0) {
    return res.status(429).json({
      error: msg(req, 'auth.ip_banned', { minutes: Math.ceil(banMs / 60000) }),
    });
  }
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 30 * 60 * 1000 });
    return next();
  }
  rec.count += 1;
  if (rec.count > 10) {
    return res.status(429).json({ error: msg(req, 'auth.rate_limited') });
  }
  next();
};

export const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);

export const validateCredentials = (username, password) => {
  if (typeof username !== 'string' || !/^[\w\u4e00-\u9fa5-]{6,18}$/.test(username)) {
    return 'auth.username_invalid';
  }
  return validatePassword(password);
};

export const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8 || password.length > 16) {
    return 'auth.password_invalid';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'auth.password_invalid';
  }
  return null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email) => {
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) {
    return 'auth.email_invalid';
  }
  return null;
};

// 邮箱验证码（内存存储）：email -> { code, sentAt, expiresAt }
// 搭架子阶段用内存即可；后续可迁移到数据库或 Redis。
const emailCodes = new Map();
const EMAIL_CODE_TTL = 10 * 60 * 1000; // 10 分钟有效
const EMAIL_CODE_INTERVAL = 30 * 60 * 1000; // 同一邮箱 30 分钟内只能发一次

/** 生成并“发送”邮箱验证码，返回 { ok, code?, retryAfter? } */
export const sendEmailVerificationCode = (email) => {
  const now = Date.now();
  const rec = emailCodes.get(email);
  if (rec && rec.sentAt + EMAIL_CODE_INTERVAL > now) {
    return {
      ok: false,
      reason: 'auth.code_too_frequent',
      retryAfter: Math.ceil((rec.sentAt + EMAIL_CODE_INTERVAL - now) / 1000),
    };
  }
  const code = String(crypto.randomInt(100000, 1000000));
  emailCodes.set(email, { code, sentAt: now, expiresAt: now + EMAIL_CODE_TTL, attempts: 0 });
  // 顺手清理过期记录，避免内存无限增长
  for (const [k, v] of emailCodes) {
    if (v.expiresAt < now) emailCodes.delete(k);
  }
  return { ok: true, code };
};

/** 校验并一次性消费验证码；连续失败超过 3 次作废，需重新发送 */
export const verifyEmailCode = (email, code) => {
  const rec = emailCodes.get(email);
  if (!rec || rec.expiresAt < Date.now()) return false;
  if (String(code) !== rec.code) {
    rec.attempts = (rec.attempts || 0) + 1;
    if (rec.attempts >= 3) emailCodes.delete(email);
    return false;
  }
  emailCodes.delete(email);
  return true;
};

/** 发送失败时清除已生成的验证码，允许立即重试 */
export const clearEmailCode = (email) => {
  emailCodes.delete(email);
};

// ---------------- 发送滥用防护 ----------------
// 1) 每 IP 每小时最多 RESEND_IP_HOURLY_LIMIT（默认 2）封
// 2) 每 IP 每天最多 RESEND_IP_DAILY_LIMIT（默认 5）封
// 3) 每邮箱每天最多 2 封
// 3) 全局每日 / 每月上限（默认对齐 Resend 免费额度 100 / 3000）

const IP_HOURLY_LIMIT = Number(process.env.RESEND_IP_HOURLY_LIMIT || 2);
const IP_WINDOW = 60 * 60 * 1000;
const IP_DAILY_LIMIT = Number(process.env.RESEND_IP_DAILY_LIMIT || 5);
const PER_EMAIL_DAILY_LIMIT = Number(process.env.RESEND_EMAIL_DAILY_LIMIT || 2);
const sentByIp = new Map(); // ip -> [timestamps]

const startOfUtcDay = (ts) => {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfUtcMonth = (ts) => {
  const d = new Date(ts);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

/** 发送前检查：返回 { ok: true } 或 { ok: false, reason } */
export const checkSendCodeLimits = (req, email) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();

  const banMs = getBanRemainingMs(ip);
  if (banMs > 0) {
    return {
      ok: false,
      reason: 'auth.ip_banned',
      vars: { minutes: Math.ceil(banMs / 60000) },
    };
  }

  const list = (sentByIp.get(ip) || []).filter((t) => now - t < IP_WINDOW);
  if (list.length >= IP_HOURLY_LIMIT) {
    return { ok: false, reason: 'auth.send_too_many' };
  }

  const ipDaily = db
    .prepare('SELECT COUNT(*) AS n FROM email_sends WHERE ip = ? AND sent_at >= ?')
    .get(ip, startOfUtcDay(now)).n;
  if (ipDaily >= IP_DAILY_LIMIT) {
    return { ok: false, reason: 'auth.send_too_many' };
  }

  const perEmail = db
    .prepare('SELECT COUNT(*) AS n FROM email_sends WHERE email = ? AND sent_at >= ?')
    .get(email, startOfUtcDay(now)).n;
  if (perEmail >= PER_EMAIL_DAILY_LIMIT) {
    return { ok: false, reason: 'auth.code_too_frequent' };
  }

  const dailyLimit = Number(process.env.RESEND_DAILY_LIMIT || 100);
  const monthlyLimit = Number(process.env.RESEND_MONTHLY_LIMIT || 3000);
  const daily = db
    .prepare('SELECT COUNT(*) AS n FROM email_sends WHERE sent_at >= ?')
    .get(startOfUtcDay(now)).n;
  const monthly = db
    .prepare('SELECT COUNT(*) AS n FROM email_sends WHERE sent_at >= ?')
    .get(startOfUtcMonth(now)).n;
  if (daily >= dailyLimit || monthly >= monthlyLimit) {
    return { ok: false, reason: 'auth.email_quota' };
  }

  sentByIp.set(ip, list);
  return { ok: true };
};

/** 发送成功后记录（计入额度与 IP 限流） */
export const recordEmailSent = (email, ip) => {
  const now = Date.now();
  db.prepare('INSERT INTO email_sends (email, ip, sent_at) VALUES (?, ?, ?)').run(
    email,
    ip || null,
    now,
  );
  const key = ip || 'unknown';
  const list = sentByIp.get(key) || [];
  list.push(now);
  sentByIp.set(key, list);
};

// ---------------- IP 封禁规则 ----------------
// 1) 认证失败（登录失败、验证码错误等）：AUTH_FAIL_WINDOW（默认 30 分钟）内同一 IP 失败
//    ≥ AUTH_FAIL_BAN_COUNT（默认 5）次 → 封禁 AUTH_FAIL_BAN_MS（默认 1 小时）
// 2) 发码超限后继续尝试：SEND_VIOLATION_WINDOW（默认 1 小时）内累计触发
//    ≥ SEND_VIOLATION_BAN_COUNT（默认 3）次 → 封禁 SEND_VIOLATION_BAN_MS（默认 24 小时）
const bannedIps = new Map(); // ip -> until
const authFailures = new Map(); // ip -> { count, windowStart }
const sendViolations = new Map(); // ip -> { count, windowStart }

const AUTH_FAIL_WINDOW = Number(process.env.AUTH_FAIL_WINDOW || 30 * 60 * 1000);
const AUTH_FAIL_BAN_COUNT = Number(process.env.AUTH_FAIL_BAN_COUNT || 5);
const AUTH_FAIL_BAN_MS = Number(process.env.AUTH_FAIL_BAN_MS || 60 * 60 * 1000);
const SEND_VIOLATION_WINDOW = Number(process.env.SEND_VIOLATION_WINDOW || 60 * 60 * 1000);
const SEND_VIOLATION_BAN_COUNT = Number(process.env.SEND_VIOLATION_BAN_COUNT || 3);
const SEND_VIOLATION_BAN_MS = Number(process.env.SEND_VIOLATION_BAN_MS || 24 * 60 * 60 * 1000);

const bumpCount = (map, ip, windowMs) => {
  const now = Date.now();
  const rec = map.get(ip);
  if (!rec || now - rec.windowStart >= windowMs) {
    map.set(ip, { count: 1, windowStart: now });
    return 1;
  }
  rec.count += 1;
  return rec.count;
};

const banIp = (ip, ms) => {
  const cur = bannedIps.get(ip) || 0;
  bannedIps.set(ip, Math.max(cur, Date.now() + ms));
};

/** 返回该 IP 剩余封禁毫秒数（0 表示未封禁），顺带清理过期记录 */
export const getBanRemainingMs = (ip) => {
  const until = bannedIps.get(ip);
  if (!until) return 0;
  const remain = until - Date.now();
  if (remain <= 0) bannedIps.delete(ip);
  return Math.max(0, remain);
};

/** 认证失败（登录失败 / 验证码错误等）时记录，达到阈值自动封禁 */
export const recordAuthFailure = (ip) => {
  const count = bumpCount(authFailures, ip, AUTH_FAIL_WINDOW);
  if (count >= AUTH_FAIL_BAN_COUNT) banIp(ip, AUTH_FAIL_BAN_MS);
};

/** 登录成功后清除失败计数 */
export const clearAuthFailures = (ip) => {
  authFailures.delete(ip);
};

/** 发码超限后仍继续尝试时记录，达到阈值自动封禁 */
export const recordSendViolation = (ip) => {
  const count = bumpCount(sendViolations, ip, SEND_VIOLATION_WINDOW);
  if (count >= SEND_VIOLATION_BAN_COUNT) banIp(ip, SEND_VIOLATION_BAN_MS);
};
