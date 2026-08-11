// 后端 API 封装（同源部署，Nginx 将 /api 反向代理到 Node 服务）
import { translate, getLang } from './i18n/index.js';

const BASE = import.meta.env.VITE_API_BASE || '';
const LANG_TAGS = { zh: 'zh-CN', 'zh-Hant': 'zh-TW', en: 'en', ja: 'ja' };

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': LANG_TAGS[getLang()] || 'en',
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.error || translate('api.requestFailed', { status: res.status }),
    );
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (username, password, email, code) =>
    request('/api/auth/register', {
      method: 'POST',
      body: { username, password, email, code },
    }),
  sendCode: (email, mode = 'register') =>
    request('/api/auth/send-code', { method: 'POST', body: { email, mode } }),
  resetPassword: (email, code, newPassword) =>
    request('/api/auth/reset-password', {
      method: 'POST',
      body: { email, code, newPassword },
    }),
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  // 网页源码抓取（后端代理，避免浏览器直连第三方导致 CSP 拦截）
  fetchUrl: (url) =>
    request('/api/fetch-url', { method: 'POST', body: { url } }),

  // 题库
  listPuzzles: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    return request(`/api/puzzles${qs.toString() ? `?${qs}` : ''}`);
  },
  randomPuzzle: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    return request(`/api/puzzles/random${qs.toString() ? `?${qs}` : ''}`);
  },
  importPuzzles: (puzzles) =>
    request('/api/puzzles/import', {
      method: 'POST',
      body: { puzzles },
    }),
  renamePuzzle: (id, name) =>
    request(`/api/puzzles/${id}/name`, { method: 'PUT', body: { name } }),
  completePuzzle: (id, grid) =>
    request(`/api/puzzles/${id}/complete`, {
      method: 'POST',
      body: grid ? { grid } : {},
    }),
  userProgress: () => request('/api/user/progress'),
};
