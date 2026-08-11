/**
 * 数织核心逻辑（前后端唯一真源）。
 * - 浏览器端经 src/logic/solver.js、src/logic/clues.js 再导出
 * - 服务端经 server/puzzle-lib.js 导入
 * 禁止在任何一侧复制实现，改动只允许发生在这里。
 */

/** 判断当前部分填充的行是否仍可能满足线索（记忆化 DP） */
export const canFit = (line, clues) => {
  const memo = new Map();
  const dp = (lIdx, cIdx) => {
    if (cIdx === clues.length) {
      for (let i = lIdx; i < line.length; i++) {
        if (line[i] === 1) return false;
      }
      return true;
    }
    if (lIdx >= line.length) return false;

    const key = lIdx * 1000 + cIdx;
    if (memo.has(key)) return memo.get(key);

    let possible = false;
    if (line[lIdx] !== 1) possible = dp(lIdx + 1, cIdx);

    if (!possible) {
      const clueLen = clues[cIdx];
      if (lIdx + clueLen <= line.length) {
        let canPlaceBlock = true;
        for (let i = 0; i < clueLen; i++) {
          if (line[lIdx + i] === 0) {
            canPlaceBlock = false;
            break;
          }
        }
        if (
          canPlaceBlock &&
          lIdx + clueLen < line.length &&
          line[lIdx + clueLen] === 1
        ) {
          canPlaceBlock = false;
        }
        if (canPlaceBlock) possible = dp(lIdx + clueLen + 1, cIdx + 1);
      }
    }

    memo.set(key, possible);
    return possible;
  };
  return dp(0, 0);
};

/**
 * 单行推导：返回能确定的格子。
 * line: -1=未知, 0=白, 1=填充；clues 需已过滤 0。
 * 返回 null 表示矛盾，否则 { newLine, changed }。
 */
export const solveLineFast = (line, clues) => {
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

/** 行/列线索提取：返回连续黑块长度数组（空行为 [0]） */
export const getLineClue = (line) => {
  const clues = [];
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] % 2 === 1) count++;
    else if (count > 0) {
      clues.push(count);
      count = 0;
    }
  }
  if (count > 0) clues.push(count);
  return clues.length > 0 ? clues : [0];
};

/**
 * 全盘逻辑传播：行/列队列交替推导直到收敛；返回 -1/0/1 盘面或 null（矛盾）。
 * rClues/cClues 为已解析的数字数组（不是字符串）。
 * maxIterations 由调用方决定：前端 200、服务端 300，保持各自历史行为。
 */
export const propagateBoard = (rClues, cClues, rCount, cCount, maxIterations) => {
  const tempBoard = Array.from({ length: rCount }, () => Array(cCount).fill(-1));

  let changed = true;
  let iteration = 0;
  const rowQueue = Array(rCount).fill(true);
  const colQueue = Array(cCount).fill(true);

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    for (let r = 0; r < rCount; r++) {
      if (!rowQueue[r]) continue;
      rowQueue[r] = false;

      const res = solveLineFast(tempBoard[r], rClues[r]);
      if (!res) return null;

      if (res.changed) {
        changed = true;
        for (let c = 0; c < cCount; c++) {
          if (tempBoard[r][c] !== res.newLine[c]) {
            tempBoard[r][c] = res.newLine[c];
            colQueue[c] = true;
          }
        }
      }
    }

    for (let c = 0; c < cCount; c++) {
      if (!colQueue[c]) continue;
      colQueue[c] = false;

      const colLine = tempBoard.map((row) => row[c]);
      const res = solveLineFast(colLine, cClues[c]);
      if (!res) return null;

      if (res.changed) {
        changed = true;
        for (let r = 0; r < rCount; r++) {
          if (tempBoard[r][c] !== res.newLine[r]) {
            tempBoard[r][c] = res.newLine[r];
            rowQueue[r] = true;
          }
        }
      }
    }
  }
  return tempBoard;
};

/** 生成一行候选：宽度 w、线索 runs，返回二进制数组列表 */
export const generateLineCandidates = (w, runs, limit = 50000) => {
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

/**
 * 完整求解：先逻辑传播，剩余未知格用 DFS 回溯补齐（行候选少者优先 + 列约束剪枝）。
 * 返回 { board, complete }：
 *   - complete=true  整盘已确定（唯一解或搜索到的一个解）
 *   - complete=false 超时/超节点，board 仅为逻辑传播部分
 * 矛盾或无解返回 null。
 */
export const solveBoard = (
  rClues,
  cClues,
  rCount,
  cCount,
  { maxIterations = 200, timeoutMs = 4000, nodeLimit = 500000 } = {},
) => {
  const propagated = propagateBoard(rClues, cClues, rCount, cCount, maxIterations);
  if (propagated === null) return null;
  if (propagated.every((row) => row.every((v) => v !== -1))) {
    return { board: propagated, complete: true };
  }

  const rowCands = rClues.map((runs) => generateLineCandidates(cCount, runs));
  for (const cands of rowCands) if (cands.length === 0) return null;

  // 行候选少者优先，加快剪枝
  const order = rowCands
    .map((cands, r) => ({ r, cands }))
    .sort((a, b) => a.cands.length - b.cands.length);

  const board = propagated.map((row) => [...row]);
  const initialRows = order.map(({ r }) => [...board[r]]);
  const deadline = Date.now() + timeoutMs;
  let nodes = 0;
  let timedOut = false;

  const tryPlace = (idx) => {
    if (timedOut) return false;
    if (++nodes > nodeLimit) {
      timedOut = true;
      return false;
    }
    if (Date.now() > deadline) {
      timedOut = true;
      return false;
    }
    if (idx === order.length) return true;

    const { r, cands } = order[idx];
    for (const cand of cands) {
      // 跳过与已确定格冲突的候选
      const known = board[r];
      let conflict = false;
      for (let c = 0; c < cCount; c++) {
        if (known[c] !== -1 && known[c] !== cand[c]) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      board[r] = cand;
      // 列约束检查：每列当前已填部分必须能被该列线索满足
      let ok = true;
      for (let c = 0; c < cCount; c++) {
        const line = new Array(rCount);
        for (let rr = 0; rr < rCount; rr++) line[rr] = board[rr][c];
        if (!canFit(line, cClues[c])) {
          ok = false;
          break;
        }
      }
      if (ok && tryPlace(idx + 1)) return true;
      if (timedOut) return false;
      board[r] = [...initialRows[idx]];
    }
    return false;
  };

  if (tryPlace(0)) return { board, complete: true };
  return timedOut ? { board: propagated, complete: false } : null;
};
