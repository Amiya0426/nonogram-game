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
