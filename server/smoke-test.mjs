/**
 * 服务器端 API 冒烟测试（独立 DATA_DIR，不影响生产数据）
 * 用法：DATA_DIR=/tmp/smoke PORT=3100 node smoke-test.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const DATA_DIR = process.env.DATA_DIR || '/tmp/nono-smoke';
const PORT = process.env.PORT || '3100';

fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const server = spawn('node', ['index.js'], {
  env: { ...process.env, DATA_DIR, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await wait(1500);
  const BASE = `http://127.0.0.1:${PORT}`;
  let cookie = '';
  async function req(path, method = 'GET', body, withCookie = true) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && withCookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  const out = [];
  const log = (s) => { console.log(s); out.push(s); };

  const uname = `smoke_${Date.now()}`;
  let r = await req('/api/auth/register', 'POST', { username: uname, password: 'password123' });
  log(`注册: ${r.status}`);

  const uniquePuzzle = {
    rows: 5, cols: 5,
    rowCluesStr: ['1.1','1.1.1','1.1','1.1','1'],
    colCluesStr: ['2','1.1','1.1','1.1','2'],
    grid: [[0,1,0,1,0],[1,0,1,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
    source: 'smoke',
  };
  r = await req('/api/puzzles/import', 'POST', { puzzle: uniquePuzzle });
  log(`导入唯一解: ${r.status} ${JSON.stringify(r.data.results?.[0])}`);

  r = await req('/api/puzzles/import', 'POST', { puzzle: uniquePuzzle });
  log(`重复导入: ${r.status} created=${r.data.results?.[0]?.created} id=${r.data.results?.[0]?.id}`);

  r = await req('/api/puzzles/import', 'POST', { puzzle: { rows: 2, cols: 2, rowCluesStr: ['1','1'], colCluesStr: ['1','1'] } });
  log(`导入多解: ${r.status} ${r.data.results?.[0]?.reason}`);

  r = await req('/api/puzzles/import', 'POST', { puzzle: { rows: 3, cols: 3, rowCluesStr: ['1','1','1'], colCluesStr: ['1','1','1'] } });
  log(`导入3x3多解: ${r.status} ${r.data.results?.[0]?.reason}`);

  r = await req('/api/puzzles/random?rows=5&cols=5');
  log(`随机5x5: ${r.status} id=${r.data.id} clues=${r.data.rowCluesStr?.join('|')}`);

  r = await req('/api/puzzles/random?minRows=4&maxRows=6&minCols=4&maxCols=6');
  log(`随机范围: ${r.status} ${r.data.rows}x${r.data.cols}`);

  r = await req('/api/puzzles/random?rows=50&cols=50');
  log(`随机50x50(应404): ${r.status}`);

  const pid = (await req('/api/puzzles/random?rows=5&cols=5')).data.id;
  r = await req(`/api/puzzles/${pid}/complete`, 'POST', { grid: uniquePuzzle.grid });
  log(`完成标记: ${r.status}`);

  r = await req(`/api/puzzles/${pid}/complete`, 'POST', { grid: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]] });
  log(`错误盘面(应400): ${r.status}`);

  r = await req('/api/user/progress');
  log(`进度: ${r.status} ${JSON.stringify(r.data)}`);

  r = await req('/api/puzzles/random?rows=5&cols=5&excludeCompleted=1');
  log(`排除已完成: ${r.status} id=${r.data.id} (已完成=${pid}, 不同=${r.data.id !== pid})`);

  server.kill();
  fs.writeFileSync('/tmp/smoke-result.txt', out.join('\n'));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  server.kill();
  process.exit(1);
});
