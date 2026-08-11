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

// ---------------- 限流 / 验证码 / 封禁（SQLite 持久化） ----------------
// 所有状态写入数据库：服务重启不丢失，PM2 多实例共享同一份数据。

const AUTH_WINDOW_MS = 30 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;

const IP_HOURLY_LIMIT = Number(process.env.RESEND_IP_HOURLY_LIMIT || 2);
const IP_WINDOW = 60 * 60 * 1000;
const IP_DAILY_LIMIT = Number(process.env.RESEND_IP_DAILY_LIMIT || 5);
const PER_EMAIL_DAILY_LIMIT = Number(process.env.RESEND_EMAIL_DAILY_LIMIT || 2);

const EMAIL_CODE_TTL = 10 * 60 * 1000; // 10 分钟有效
const EMAIL_CODE_INTERVAL = 30 * 60 * 1000; // 同一邮箱 30 分钟内只能发一次

const AUTH_FAIL_WINDOW = Number(process.env.AUTH_FAIL_WINDOW || 30 * 60 * 1000);
const AUTH_FAIL_BAN_COUNT = Number(process.env.AUTH_FAIL_BAN_COUNT || 5);
const AUTH_FAIL_BAN_MS = Number(process.env.AUTH_FAIL_BAN_MS || 60 * 60 * 1000);
const SEND_VIOLATION_WINDOW = Number(process.env.SEND_VIOLATION_WINDOW || 60 * 60 * 1000);
const SEND_VIOLATION_BAN_COUNT = Number(process.env.SEND_VIOLATION_BAN_COUNT || 3);
const SEND_VIOLATION_BAN_MS = Number(process.env.SEND_VIOLATION_BAN_MS || 24 * 60 * 60 * 1000);

/** 清理过期状态行（启动与发送验证码时顺带执行，避免表无限增长） */
export const cleanupAuthState = () => {
  const now = Date.now();
  try {
    db.prepare('DELETE FROM ip_bans WHERE until <= ?').run(now);
    db.prepare('DELETE FROM auth_attempts WHERE reset_at <= ?').run(now);
    db.prepare('DELETE FROM email_codes WHERE expires_at <= ?').run(now);
    db.prepare('DELETE FROM auth_failures WHERE window_start + ? <= ?').run(AUTH_FAIL_WINDOW, now);
    db.prepare('DELETE FROM send_violations WHERE window_start + ? <= ?').run(SEND_VIOLATION_WINDOW, now);
  } catch {
    // 清理失败不阻塞主流程
  }
};

/** 返回该 IP 剩余封禁毫秒数（0 表示未封禁），顺带清理过期记录 */
export const getBanRemainingMs = (ip) => {
  const row = db.prepare('SELECT until FROM ip_bans WHERE ip = ?').get(ip);
  if (!row) return 0;
  const remain = row.until - Date.now();
  if (remain <= 0) {
    db.prepare('DELETE FROM ip_bans WHERE ip = ?').run(ip);
    return 0;
  }
  return remain;
};

const banIp = (ip, ms) => {
  const until = Date.now() + ms;
  db.prepare(
    `INSERT INTO ip_bans (ip, until) VALUES (?, ?)
     ON CONFLICT(ip) DO UPDATE SET until = MAX(ip_bans.until, excluded.until)`,
  ).run(ip, until);
};

/** 登录/注册接口的限流：每 IP 30 分钟内最多 AUTH_MAX_ATTEMPTS 次尝试 */
export const authRateLimit = (req, res, next) => {
  const ip = req.ip || 'unknown';
  const banMs = getBanRemainingMs(ip);
  if (banMs > 0) {
    return res.status(429).json({
      error: msg(req, 'auth.ip_banned', { minutes: Math.ceil(banMs / 60000) }),
    });
  }
  const now = Date.now();
  const rec = db.prepare('SELECT count, reset_at FROM auth_attempts WHERE ip = ?').get(ip);
  if (!rec || rec.reset_at < now) {
    db.prepare(
      `INSERT INTO auth_attempts (ip, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(ip) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
    ).run(ip, now + AUTH_WINDOW_MS);
    return next();
  }
  const count = rec.count + 1;
  db.prepare('UPDATE auth_attempts SET count = ? WHERE ip = ?').run(count, ip);
  if (count > AUTH_MAX_ATTEMPTS) {
    return res.status(429).json({ error: msg(req, 'auth.rate_limited') });
  }
  next();
};

/** 生成并“发送”邮箱验证码，返回 { ok, code?, retryAfter? } */
export const sendEmailVerificationCode = (email) => {
  const now = Date.now();
  cleanupAuthState();
  const rec = db.prepare('SELECT sent_at FROM email_codes WHERE email = ?').get(email);
  if (rec && rec.sent_at + EMAIL_CODE_INTERVAL > now) {
    return {
      ok: false,
      reason: 'auth.code_too_frequent',
      retryAfter: Math.ceil((rec.sent_at + EMAIL_CODE_INTERVAL - now) / 1000),
    };
  }
  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare(
    `INSERT INTO email_codes (email, code, sent_at, expires_at, attempts) VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(email) DO UPDATE SET
       code = excluded.code,
       sent_at = excluded.sent_at,
       expires_at = excluded.expires_at,
       attempts = 0`,
  ).run(email, code, now, now + EMAIL_CODE_TTL);
  return { ok: true, code };
};

/** 校验并一次性消费验证码；连续失败超过 3 次作废，需重新发送 */
export const verifyEmailCode = (email, code) => {
  const rec = db.prepare('SELECT * FROM email_codes WHERE email = ?').get(email);
  if (!rec || rec.expires_at < Date.now()) return false;
  if (String(code) !== rec.code) {
    const attempts = rec.attempts + 1;
    if (attempts >= 3) db.prepare('DELETE FROM email_codes WHERE email = ?').run(email);
    else db.prepare('UPDATE email_codes SET attempts = ? WHERE email = ?').run(attempts, email);
    return false;
  }
  db.prepare('DELETE FROM email_codes WHERE email = ?').run(email);
  return true;
};

/** 发送失败时清除已生成的验证码，允许立即重试 */
export const clearEmailCode = (email) => {
  db.prepare('DELETE FROM email_codes WHERE email = ?').run(email);
};

// ---------------- 发送滥用防护（基于 email_sends 记录） ----------------
// 1) 每 IP 每小时 RESEND_IP_HOURLY_LIMIT（默认 2）封
// 2) 每 IP 每天 RESEND_IP_DAILY_LIMIT（默认 5）封
// 3) 每邮箱每天 2 封
// 4) 全局每日 / 每月上限（默认对齐 Resend 免费额度 100 / 3000）

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

/** 发送前检查：返回 { ok: true } 或 { ok: false, reason, vars? } */
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

  const countSince = (where, ...params) =>
    db.prepare(`SELECT COUNT(*) AS n FROM email_sends WHERE ${where}`).get(...params).n;

  if (countSince('ip = ? AND sent_at >= ?', ip, now - IP_WINDOW) >= IP_HOURLY_LIMIT) {
    return { ok: false, reason: 'auth.send_too_many' };
  }
  if (countSince('ip = ? AND sent_at >= ?', ip, startOfUtcDay(now)) >= IP_DAILY_LIMIT) {
    return { ok: false, reason: 'auth.send_too_many' };
  }
  if (countSince('email = ? AND sent_at >= ?', email, startOfUtcDay(now)) >= PER_EMAIL_DAILY_LIMIT) {
    return { ok: false, reason: 'auth.code_too_frequent' };
  }

  const dailyLimit = Number(process.env.RESEND_DAILY_LIMIT || 100);
  const monthlyLimit = Number(process.env.RESEND_MONTHLY_LIMIT || 3000);
  if (countSince('sent_at >= ?', startOfUtcDay(now)) >= dailyLimit) {
    return { ok: false, reason: 'auth.email_quota' };
  }
  if (countSince('sent_at >= ?', startOfUtcMonth(now)) >= monthlyLimit) {
    return { ok: false, reason: 'auth.email_quota' };
  }

  return { ok: true };
};

/** 发送成功后记录（计入额度与限流） */
export const recordEmailSent = (email, ip) => {
  db.prepare('INSERT INTO email_sends (email, ip, sent_at) VALUES (?, ?, ?)').run(
    email,
    ip || null,
    Date.now(),
  );
};

// ---------------- IP 封禁规则 ----------------
// 认证失败（登录失败、验证码错误等）或发码超限后继续尝试，达到阈值自动封禁。

const bumpDbCount = (table, ip, windowMs) => {
  const now = Date.now();
  const row = db.prepare(`SELECT count, window_start FROM ${table} WHERE ip = ?`).get(ip);
  if (!row || now - row.window_start >= windowMs) {
    db.prepare(
      `INSERT INTO ${table} (ip, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(ip) DO UPDATE SET count = 1, window_start = excluded.window_start`,
    ).run(ip, now);
    return 1;
  }
  const count = row.count + 1;
  db.prepare(`UPDATE ${table} SET count = ? WHERE ip = ?`).run(count, ip);
  return count;
};

/** 认证失败（登录失败 / 验证码错误等）时记录，达到阈值自动封禁 */
export const recordAuthFailure = (ip) => {
  const count = bumpDbCount('auth_failures', ip, AUTH_FAIL_WINDOW);
  if (count >= AUTH_FAIL_BAN_COUNT) banIp(ip, AUTH_FAIL_BAN_MS);
};

/** 登录成功后清除失败计数 */
export const clearAuthFailures = (ip) => {
  db.prepare('DELETE FROM auth_failures WHERE ip = ?').run(ip);
};

/** 发码超限后仍继续尝试时记录，达到阈值自动封禁 */
export const recordSendViolation = (ip) => {
  const count = bumpDbCount('send_violations', ip, SEND_VIOLATION_WINDOW);
  if (count >= SEND_VIOLATION_BAN_COUNT) banIp(ip, SEND_VIOLATION_BAN_MS);
};
