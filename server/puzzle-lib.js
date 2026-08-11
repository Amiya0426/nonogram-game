// 题目校验 / 唯一解判定 / 内容指纹与唯一数字 ID
import crypto from 'node:crypto';
import { canFit, propagateBoard, getLineClue, generateLineCandidates } from '../shared/puzzle-core.mjs';

export const MAX_BOARD = 80;
export const MIN_BOARD = 3;

/** 任意分隔符的线索字符串 -> 数字数组（过滤 0/空） */
export const parseClueStr = (str) => {
  const nums = String(str ?? '')
    .split(/[^0-9]+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  return nums.length ? nums : [0];
};

/** 规范化题目对象：{ rows, cols, rowClues, colClues }，rowClues/colClues 为数字数组数组 */
export const normalizePuzzle = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const rows = Number(raw.rows ?? raw.height ?? 0);
  const cols = Number(raw.cols ?? raw.width ?? 0);
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return null;
  if (rows < MIN_BOARD || rows > MAX_BOARD || cols < MIN_BOARD || cols > MAX_BOARD) return null;

  const rawRows = Array.isArray(raw.rowClues)
    ? raw.rowClues
    : Array.isArray(raw.rowCluesStr)
      ? raw.rowCluesStr
      : null;
  const rawCols = Array.isArray(raw.colClues)
    ? raw.colClues
    : Array.isArray(raw.colCluesStr)
      ? raw.colCluesStr
      : null;
  if (!rawRows || !rawCols) return null;

  const toClue = (v) =>
    Array.isArray(v)
      ? v.filter((n) => Number.isInteger(n) && n > 0)
      : parseClueStr(v);

  const rowClues = rawRows.map(toClue);
  const colClues = rawCols.map(toClue);
  if (rowClues.length !== rows || colClues.length !== cols) return null;
  return { rows, cols, rowClues, colClues, grid: raw.grid ?? null };
};

/** 合法性：线索数量和不超过边长 */
export const validatePuzzle = (p) => {
  if (!p) return { ok: false, reason: '题目格式不正确' };
  for (let r = 0; r < p.rows; r++) {
    const sum = p.rowClues[r].reduce((a, b) => a + b, 0);
    if (sum > p.cols) return { ok: false, reason: `第 ${r + 1} 行线索与列数矛盾` };
  }
  for (let c = 0; c < p.cols; c++) {
    const sum = p.colClues[c].reduce((a, b) => a + b, 0);
    if (sum > p.rows) return { ok: false, reason: `第 ${c + 1} 列线索与行数矛盾` };
  }
  return { ok: true };
};

/** 内容指纹：行列线索（保持顺序）的规范化哈希，用于去重 */
export const contentHash = (p) => {
  const norm = (clues) => clues.map((arr) => arr.join(',')).join(';');
  const content = `${p.rows}|${p.cols}|${norm(p.rowClues)}|${norm(p.colClues)}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

/** 唯一数字 ID：内容指纹前 8 字节转十进制 */
export const puzzleIdFromHash = (hash) => BigInt(`0x${hash.slice(0, 16)}`).toString();

// ---------- 唯一解判定 ----------

/**
 * 唯一解判定：逐行 DFS + 列约束剪枝。
 * 返回 { count: 解的数量（0/1/2，2 表示 >=2）, timeout: boolean }
 * limit 找到第 limit 个解即返回。
 */
export const countSolutions = (p, { timeoutMs = 15000, limit = 2, nodeLimit = 1200000 } = {}) => {
  const { rows, cols, rowClues, colClues } = p;
  const deadline = Date.now() + timeoutMs;

  // 1) 逻辑传播：全部确定 -> 必为唯一解；矛盾 -> 无解
  const propagated = propagateBoard(rowClues, colClues, rows, cols, 300);
  if (propagated === null) return { count: 0, timeout: false };
  if (propagated.every((row) => row.every((v) => v !== -1))) {
    return { count: 1, timeout: false };
  }

  // 2) 需试错：对剩余未知格 DFS
  const rowCands = rowClues.map((runs) => generateLineCandidates(cols, runs));
  for (const cands of rowCands) if (cands.length === 0) return { count: 0, timeout: false };

  // 行候选少者优先，加快剪枝
  const order = rowCands
    .map((cands, r) => ({ r, cands }))
    .sort((a, b) => a.cands.length - b.cands.length);

  const board = propagated.map((row) => [...row]);
  const initialRows = order.map(({ r }) => [...board[r]]);
  let solutions = 0;
  let nodes = 0;
  let timedOut = false;

  const tryPlace = (idx) => {
    if (solutions >= limit) return;
    if (++nodes > nodeLimit) return;
    if (Date.now() > deadline) { timedOut = true; return; }
    if (idx === order.length) {
      solutions++;
      return;
    }
    const { r, cands } = order[idx];
    for (const cand of cands) {
      // 跳过与已确定格冲突的候选
      const known = board[r];
      let conflict = false;
      for (let c = 0; c < cols; c++) {
        if (known[c] !== -1 && known[c] !== cand[c]) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;
      board[r] = cand;
      // 列约束检查：每列当前已填部分必须能被该列线索满足
      let ok = true;
      for (let c = 0; c < cols; c++) {
        const line = new Array(rows);
        for (let rr = 0; rr < rows; rr++) line[rr] = board[rr][c];
        if (!canFit(line, colClues[c])) { ok = false; break; }
        if ((c & 7) === 0 && Date.now() > deadline) { timedOut = true; return; }
      }
      if (ok) tryPlace(idx + 1);
      if (solutions >= limit || timedOut || nodes > nodeLimit) return;
      board[r] = [...initialRows[idx]];
    }
  };

  tryPlace(0);
  return {
    count: solutions >= limit ? limit : solutions,
    timeout: timedOut || nodes > nodeLimit,
  };
};

/** 根据答案网格校验（可选）：grid 是否满足线索（用于答案一致性检查） */
export const gridMatchesClues = (p) => {
  const grid = p.grid;
  if (!grid || !Array.isArray(grid) || grid.length !== p.rows) return false;
  for (let r = 0; r < p.rows; r++) {
    const row = grid[r];
    if (!Array.isArray(row) || row.length !== p.cols) return false;
    if (JSON.stringify(getLineClue(row)) !== JSON.stringify(p.rowClues[r])) return false;
  }
  for (let c = 0; c < p.cols; c++) {
    const col = new Array(p.rows);
    for (let r = 0; r < p.rows; r++) col[r] = grid[r][c];
    if (JSON.stringify(getLineClue(col)) !== JSON.stringify(p.colClues[c])) return false;
  }
  return true;
};
