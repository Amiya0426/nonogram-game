// 题目校验 / 唯一解判定 / 内容指纹与唯一数字 ID
import crypto from 'node:crypto';

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

/** 生成一行候选：宽度 w、线索 runs，返回二进制数组列表 */
const generateLineCandidates = (w, runs, limit = 50000) => {
  const blocks = runs.filter((n) => n > 0);
  if (blocks.length === 0) return [new Array(w).fill(0)];
  const total = blocks.reduce((a, b) => a + b, 0);
  const free = w - total;
  if (free < 0) return [];
  const k = blocks.length;
  const out = [];
  // gaps[0..k]：除固定块间分隔（每对块之间 1 格）外的额外空位分配
  const gaps = new Array(k + 1).fill(0);
  const rec = (idx, remaining) => {
    if (out.length >= limit) return;
    if (idx === k) {
      gaps[k] = remaining;
      const row = new Array(w).fill(0);
      let pos = 0;
      for (let i = 0; i < k; i++) {
        pos += gaps[i];
        for (let j = 0; j < blocks[i]; j++) row[pos++] = 1;
        if (i < k - 1) pos += 1; // 块间至少一个空
      }
      out.push(row);
      return;
    }
    for (let g = 0; g <= remaining; g++) {
      gaps[idx] = g;
      rec(idx + 1, remaining - g);
      if (out.length >= limit) return;
    }
  };
  rec(0, Math.max(0, free - (k - 1))); // 减去固定的块间分隔
  return out;
};

/** 判断部分行是否能满足线索（记忆化 DP，0=白 1=黑 -1=未知） */
const canFit = (line, clues) => {
  const valid = clues.filter((c) => c > 0);
  const memo = new Map();
  const dp = (li, ci) => {
    if (ci === valid.length) {
      for (let i = li; i < line.length; i++) if (line[i] === 1) return false;
      return true;
    }
    if (li >= line.length) return false;
    const key = li * 1000 + ci;
    if (memo.has(key)) return memo.get(key);
    let ok = false;
    if (line[li] !== 1) ok = dp(li + 1, ci);
    if (!ok) {
      const len = valid[ci];
      if (li + len <= line.length) {
        let place = true;
        for (let i = 0; i < len; i++) if (line[li + i] === 0) { place = false; break; }
        if (place && li + len < line.length && line[li + len] === 1) place = false;
        if (place) ok = dp(li + len + 1, ci + 1);
      }
    }
    memo.set(key, ok);
    return ok;
  };
  return dp(0, 0);
};

/** 单行逻辑推导：返回能确定的格子（null=矛盾，{newLine, changed}） */
const solveLineFast = (line, clues) => {
  const validClues = clues.filter((c) => c > 0);
  if (!canFit(line, validClues)) return null;
  let changed = false;
  const newLine = [...line];
  for (let i = 0; i < line.length; i++) {
    if (newLine[i] === -1) {
      newLine[i] = 1;
      const canBe1 = canFit(newLine, validClues);
      newLine[i] = 0;
      const canBe0 = canFit(newLine, validClues);
      newLine[i] = -1;
      if (canBe1 && !canBe0) {
        newLine[i] = 1;
        changed = true;
      } else if (!canBe1 && canBe0) {
        newLine[i] = 0;
        changed = true;
      } else if (!canBe1 && !canBe0) {
        return null;
      }
    }
  }
  return { newLine, changed };
};

/** 全盘逻辑传播：行/列交替推导直到收敛；null=矛盾 */
const propagateBoard = (rows, cols, rowClues, colClues) => {
  const board = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  let changed = true;
  let iter = 0;
  while (changed && iter < 300) {
    changed = false;
    iter++;
    for (let r = 0; r < rows; r++) {
      const res = solveLineFast(board[r], rowClues[r]);
      if (!res) return null;
      if (res.changed) {
        board[r] = res.newLine;
        changed = true;
      }
    }
    for (let c = 0; c < cols; c++) {
      const line = new Array(rows);
      for (let r = 0; r < rows; r++) line[r] = board[r][c];
      const res = solveLineFast(line, colClues[c]);
      if (!res) return null;
      if (res.changed) {
        for (let r = 0; r < rows; r++) board[r][c] = res.newLine[r];
        changed = true;
      }
    }
  }
  return board;
};

/**
 * 唯一解判定：逐行 DFS + 列约束剪枝。
 * 返回 { count: 解的数量（0/1/2，2 表示 >=2）, timeout: boolean }
 * limit 找到第 limit 个解即返回。
 */
export const countSolutions = (p, { timeoutMs = 15000, limit = 2, nodeLimit = 1200000 } = {}) => {
  const { rows, cols, rowClues, colClues } = p;
  const deadline = Date.now() + timeoutMs;

  // 1) 逻辑传播：全部确定 -> 必为唯一解；矛盾 -> 无解
  const propagated = propagateBoard(rows, cols, rowClues, colClues);
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
  const lineClues = (line) => {
    const runs = [];
    let run = 0;
    for (const v of line) {
      if (v) run++;
      else if (run) { runs.push(run); run = 0; }
    }
    if (run) runs.push(run);
    return runs.length ? runs : [0];
  };
  for (let r = 0; r < p.rows; r++) {
    const row = grid[r];
    if (!Array.isArray(row) || row.length !== p.cols) return false;
    if (JSON.stringify(lineClues(row)) !== JSON.stringify(p.rowClues[r])) return false;
  }
  for (let c = 0; c < p.cols; c++) {
    const col = new Array(p.rows);
    for (let r = 0; r < p.rows; r++) col[r] = grid[r][c];
    if (JSON.stringify(lineClues(col)) !== JSON.stringify(p.colClues[c])) return false;
  }
  return true;
};
