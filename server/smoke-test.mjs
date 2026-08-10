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
  let fails = 0;
  const log = (s) => { console.log(s); out.push(s); };
  const check = (name, ok, extra = '') => {
    if (!ok) fails++;
    log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  };

  const uname = `smoke_${Date.now()}`;
  let r = await req('/api/auth/register', 'POST', { username: uname, password: 'password123' });
  log(`注册: ${r.status}`);
  const uid = r.data?.id;

  const uniquePuzzle = {
    rows: 5, cols: 5,
    rowCluesStr: ['1.1','1.1.1','1.1','1.1','1'],
    colCluesStr: ['2','1.1','1.1','1.1','2'],
    grid: [[0,1,0,1,0],[1,0,1,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
    source: 'smoke',
  };
  r = await req('/api/puzzles/import', 'POST', { puzzle: uniquePuzzle });
  log(`导入唯一解: ${r.status} ${JSON.stringify(r.data.results?.[0])}`);
  const uniquePuzzleId = r.data.results?.[0]?.id;

  r = await req('/api/puzzles/import', 'POST', { puzzle: uniquePuzzle });
  log(`重复导入: ${r.status} created=${r.data.results?.[0]?.created} id=${r.data.results?.[0]?.id}`);

  const secondPuzzle = {
    rows: 5, cols: 5,
    rowCluesStr: ['1 1','1 1','1 1','0','0'],
    colCluesStr: ['3','0','3','0','0'],
    grid: [[1,0,1,0,0],[1,0,1,0,0],[1,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0]],
    source: 'smoke2',
  };
  r = await req('/api/puzzles/import', 'POST', { puzzle: secondPuzzle });
  log(`导入第二题: ${r.status} id=${r.data.results?.[0]?.id}`);
  const secondPuzzleId = r.data.results?.[0]?.id;

  r = await req('/api/puzzles/import', 'POST', { puzzle: { rows: 2, cols: 2, rowCluesStr: ['1','1'], colCluesStr: ['1','1'] } });
  log(`导入多解: ${r.status} ${r.data.results?.[0]?.reason}`);

  r = await req('/api/puzzles/import', 'POST', { puzzle: { rows: 3, cols: 3, rowCluesStr: ['1','1','1'], colCluesStr: ['1','1','1'] } });
  log(`导入3x3多解: ${r.status} ${r.data.results?.[0]?.reason}`);

  r = await req('/api/puzzles/random?rows=5&cols=5');
  log(`随机5x5: ${r.status} id=${r.data.id} clues=${r.data.rowCluesStr?.join('|')}`);
  check(
    '随机题带用户归属',
    r.data.user_id === uid && r.data.contributor === uname,
    `user_id=${r.data.user_id} contributor=${r.data.contributor} uid=${uid}`,
  );

  r = await req('/api/puzzles/random?minRows=4&maxRows=6&minCols=4&maxCols=6');
  log(`随机范围: ${r.status} ${r.data.rows}x${r.data.cols}`);

  r = await req('/api/puzzles/random?rows=50&cols=50');
  log(`随机50x50(应404): ${r.status}`);

  r = await req('/api/collections', 'POST', { name: '收藏测试', puzzle: uniquePuzzle });
  log(`收藏: ${r.status} puzzle_id=${r.data?.puzzle_id}`);
  check(
    '收藏自动关联题库',
    r.data?.puzzle_id === uniquePuzzleId,
    `puzzle_id=${r.data?.puzzle_id} expected=${uniquePuzzleId}`,
  );
  r = await req(`/api/puzzles/${uniquePuzzleId}/complete`, 'POST', { grid: uniquePuzzle.grid });
  log(`完成标记: ${r.status}`);

  r = await req(`/api/puzzles/${uniquePuzzleId}/complete`, 'POST', { grid: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]] });
  log(`错误盘面(应400): ${r.status}`);

  r = await req('/api/user/progress');
  log(`进度: ${r.status} ${JSON.stringify(r.data)}`);

  r = await req('/api/puzzles/random?rows=5&cols=5&excludeCompleted=1');
  const excludedOk = r.data?.id === secondPuzzleId && r.data.id !== uniquePuzzleId;
  check(
    '排除已完成(excludeCompleted)',
    excludedOk,
    `status=${r.status} id=${r.data?.id} 已完成=${uniquePuzzleId} 期望=${secondPuzzleId}`,
  );

  server.kill();
  fs.writeFileSync('/tmp/smoke-result.txt', out.join('\n'));
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  server.kill();
  process.exit(1);
});
