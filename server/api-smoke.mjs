// 临时 API 冒烟测试：注册→登录态→收藏 CRUD→登出→异常路径
const BASE = process.env.SMOKE_BASE || 'http://localhost:3100';
let cookie = '';

const req = async (path, method = 'GET', body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
};

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
};

const username = `tester_${Date.now() % 100000}`;

let r = await req('/api/health');
check('health', r.status === 200 && r.data.ok === true, JSON.stringify(r.data));

r = await req('/api/auth/register', 'POST', { username, password: 'secret123' });
check('register 成功并返回用户', r.status === 200 && r.data.username === username, JSON.stringify(r.data));
check('register 设置了会话 Cookie', cookie.startsWith('sid='));

r = await req('/api/auth/me');
check('me 返回当前用户', r.status === 200 && r.data.username === username);

r = await req('/api/auth/register', 'POST', { username, password: 'secret123' });
check('重复注册返回 409', r.status === 409);

r = await req('/api/auth/register', 'POST', { username: 'x', password: '123' });
check('弱用户名/密码返回 400', r.status === 400);

const puzzle = {
  rows: 5,
  cols: 5,
  rowCluesStr: ['1 1', '5', '5', '3', '1'],
  colCluesStr: ['2', '4', '4', '4', '2'],
  grid: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
  markedRowClues: {},
  markedColClues: {},
  isSolvedStatus: false,
  deductionLevel: 0,
  backupGrids: [],
};

r = await req('/api/collections', 'POST', { name: '心形测试', puzzle });
check('新增收藏返回 item', r.status === 200 && r.data.name === '心形测试' && r.data.id, JSON.stringify(r.data));
const itemId = r.data?.id;

r = await req('/api/collections');
check('列表包含新增收藏', r.status === 200 && Array.isArray(r.data) && r.data.length === 1 && r.data[0].rows === 5);

r = await req(`/api/collections/${itemId}`, 'PUT', { name: '心形改名' });
check('更新收藏名称', r.status === 200 && r.data.name === '心形改名');

r = await req('/api/collections', 'POST', { name: '第二个', puzzle });
const secondId = r.data?.id;
check('新增第二个收藏', r.status === 200 && !!secondId);

r = await req(`/api/collections/${secondId}`, 'DELETE');
check('删除收藏', r.status === 200 && r.data.ok === true);

r = await req('/api/collections');
check('删除后列表只剩 1 个', r.status === 200 && r.data.length === 1);

r = await req('/api/auth/logout', 'POST');
check('登出成功', r.status === 200);

r = await req('/api/auth/me');
check('登出后 me 返回 401', r.status === 401);

r = await req('/api/collections');
check('未登录访问收藏返回 401', r.status === 401);

r = await req('/api/auth/login', 'POST', { username, password: 'wrongpass' });
check('错误密码返回 401', r.status === 401);

r = await req('/api/auth/login', 'POST', { username, password: 'secret123' });
check('重新登录成功', r.status === 200 && r.data.username === username);

r = await req('/api/collections');
check('重新登录后能看到云端收藏', r.status === 200 && r.data.length === 1 && r.data[0].name === '心形改名');

console.log(`\n===== 结果: ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
