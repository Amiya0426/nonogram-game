// 测试新版 progress API（独立实例）
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const DATA_DIR = '/tmp/prog-test-db';
const PORT = '3102';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const server = spawn('node', ['index.js'], {
  env: { ...process.env, DATA_DIR, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((r) => setTimeout(r, 1500));
const BASE = `http://127.0.0.1:${PORT}`;
let cookie = '';
async function req(path, method = 'GET', body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

let r = await req('/api/auth/register', 'POST', { username: 'pt_user', password: 'password123' });
console.log('注册:', r.status);

r = await req('/api/puzzles/import', 'POST', {
  puzzle: {
    rows: 5, cols: 5,
    rowCluesStr: ['1.1', '1.1.1', '1.1', '1.1', '1'],
    colCluesStr: ['2', '1.1', '1.1', '1.1', '2'],
  },
});
console.log('导入:', r.status, r.data.imported);

r = await req('/api/puzzles/random?rows=5&cols=5');
const pid = r.data.id;
console.log('随机:', r.status, pid);

r = await req(`/api/puzzles/${pid}/complete`, 'POST', {});
console.log('完成:', r.status);

r = await req('/api/user/progress');
console.log('进度(新格式):', r.status, JSON.stringify(r.data));

server.kill();
process.exit(0);
