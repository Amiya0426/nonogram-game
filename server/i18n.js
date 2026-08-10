// 服务端错误消息本地化：根据请求 Accept-Language 返回对应语言
const zh = {
  'auth.username_invalid': '用户名需为 2-32 位字母、数字、下划线或中文',
  'auth.password_invalid': '密码长度需为 6-72 位',
  'auth.user_exists': '用户名已存在，请直接登录',
  'auth.credentials_required': '请输入用户名和密码',
  'auth.wrong_credentials': '用户名或密码错误',
  'auth.unauthorized': '未登录',
  'auth.session_expired': '会话已过期，请重新登录',
  'auth.rate_limited': '尝试次数过多，请 15 分钟后再试',
  'puzzle.none': '暂无该尺寸范围的题目，请先导入题库',
  'puzzle.import_empty': '请提供 puzzle 或 puzzles 数组',
  'puzzle.import_too_many': '单次最多导入 200 道题',
  'puzzle.invalid_format': '题目格式不正确',
  'puzzle.no_solution': '题目无解',
  'puzzle.multi_solution': '题目存在多个解，不符合唯一解要求',
  'puzzle.timeout': '唯一解校验超时，暂无法入库',
  'puzzle.batch_timeout': '整体校验超时，请分批导入',
  'puzzle.not_found': '题目不存在',
  'puzzle.rename_forbidden': '只能修改自己导入的题目名称',
  'puzzle.grid_mismatch': '盘面与答案不一致',
  'api.not_found': '接口不存在',
  'api.internal_error': '服务器内部错误',
};

const en = {
  'auth.username_invalid': 'Username must be 2-32 letters, digits, underscores or Chinese characters',
  'auth.password_invalid': 'Password must be 6-72 characters',
  'auth.user_exists': 'Username already exists, please sign in directly',
  'auth.credentials_required': 'Please enter username and password',
  'auth.wrong_credentials': 'Incorrect username or password',
  'auth.unauthorized': 'Not signed in',
  'auth.session_expired': 'Session expired, please sign in again',
  'auth.rate_limited': 'Too many attempts, please try again in 15 minutes',
  'puzzle.none': 'No puzzles in this size range yet, please import some first',
  'puzzle.import_empty': 'Please provide a puzzle or puzzles array',
  'puzzle.import_too_many': 'You can import at most 200 puzzles at once',
  'puzzle.invalid_format': 'Invalid puzzle format',
  'puzzle.no_solution': 'The puzzle has no solution',
  'puzzle.multi_solution': 'The puzzle has multiple solutions and does not meet the unique-solution requirement',
  'puzzle.timeout': 'Unique-solution check timed out, cannot be added yet',
  'puzzle.batch_timeout': 'Batch check timed out, please import in smaller batches',
  'puzzle.not_found': 'Puzzle not found',
  'puzzle.rename_forbidden': 'You can only rename puzzles you imported',
  'puzzle.grid_mismatch': 'The board does not match the answer',
  'api.not_found': 'Endpoint not found',
  'api.internal_error': 'Internal server error',
};

const pickLang = (req) => {
  const h = String(req.headers?.['accept-language'] || 'zh').toLowerCase();
  return h.startsWith('zh') ? 'zh' : 'en';
};

export const msg = (req, key) => {
  const dict = pickLang(req) === 'en' ? en : zh;
  return dict[key] ?? zh[key] ?? key;
};
