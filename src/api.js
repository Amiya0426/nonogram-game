// 后端 API 封装（同源部署，Nginx 将 /api 反向代理到 Node 服务）

const BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `请求失败 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (username, password) =>
    request('/api/auth/register', { method: 'POST', body: { username, password } }),
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

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
