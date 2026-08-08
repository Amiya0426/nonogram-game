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
  listCollections: () => request('/api/collections'),
  addCollection: (item) =>
    request('/api/collections', {
      method: 'POST',
      body: { name: item.name, puzzle: item },
    }),
  updateCollection: (id, patch) =>
    request(`/api/collections/${id}`, { method: 'PUT', body: patch }),
  deleteCollection: (id) => request(`/api/collections/${id}`, { method: 'DELETE' }),
};
