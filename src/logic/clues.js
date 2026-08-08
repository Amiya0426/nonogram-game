// 线索解析、行/列状态判定与自动高亮逻辑

/** 将线索文本解析为数字数组；无法解析时返回 [0] */
export const parseClue = (str) => {
  if (typeof str !== 'string') return [0];
  const parsed = str
    .trim()
    .split(/[\s,]+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n > 0);
  return parsed.length > 0 ? parsed : [0];
};

/** 根据当前盘面值提取“已形成的连续块”线索 */
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

export const arraysEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const isLineCompleted = (line, targetClues) =>
  arraysEqual(targetClues, getLineClue(line));

/**
 * 归一化一行/列的盘面值，供自动高亮使用（与原逻辑保持一致：
 * 仅 1/3 视为填充、2/4 视为叉）。
 */
export const normalizeLine = (line) =>
  line.map((v) => (v === 1 || v === 3 ? 1 : v === 2 || v === 4 ? 2 : 0));

/**
 * 自动高亮已确认的线索数字。
 * 与原始算法一致（首尾确认 + 唯一长度匹配），但将 hasUnknownLeft/Right
 * 的逐格扫描优化为 O(n) 前缀零计数。
 */
export const getAutoMarked = (line, clues) => {
  const marked = new Array(clues.length).fill(false);
  const assignedBlocks = [];
  const blocks = [];
  let currentStart = -1;
  const len = line.length;

  // 前缀零计数：zeroPrefix[i] = line[0..i-1] 中 0 的个数
  const zeroPrefix = new Array(len + 1).fill(0);
  for (let i = 0; i < len; i++) {
    zeroPrefix[i + 1] = zeroPrefix[i] + (line[i] === 0 ? 1 : 0);
  }
  const totalZeros = zeroPrefix[len];

  for (let i = 0; i <= len; i++) {
    const isBlack = i < len && line[i] % 2 === 1;
    if (isBlack) {
      if (currentStart === -1) currentStart = i;
    } else if (currentStart !== -1) {
      const isLeftBounded =
        currentStart === 0 || (line[currentStart - 1] > 0 && line[currentStart - 1] % 2 === 0);
      const isRightBounded =
        i === len || (line[i] > 0 && line[i] % 2 === 0);
      const hasUnknownLeft = zeroPrefix[currentStart] > 0;
      const hasUnknownRight = totalZeros - zeroPrefix[i] > 0;

      blocks.push({
        start: currentStart,
        end: i - 1,
        len: i - currentStart,
        isFullyBounded: isLeftBounded && isRightBounded,
        hasUnknownLeft,
        hasUnknownRight,
        assignedClueIdx: -1,
      });
      currentStart = -1;
    }
  }

  let clueIdx = 0;
  for (let b = 0; b < blocks.length; b++) {
    if (clueIdx >= clues.length) break;
    if (
      blocks[b].isFullyBounded &&
      !blocks[b].hasUnknownLeft &&
      blocks[b].len === clues[clueIdx]
    ) {
      blocks[b].assignedClueIdx = clueIdx;
      marked[clueIdx] = true;
      assignedBlocks.push({ clueIdx, start: blocks[b].start, end: blocks[b].end });
      clueIdx++;
    } else break;
  }

  clueIdx = clues.length - 1;
  for (let b = blocks.length - 1; b >= 0; b--) {
    if (clueIdx < 0 || blocks[b].assignedClueIdx !== -1) break;
    if (
      blocks[b].isFullyBounded &&
      !blocks[b].hasUnknownRight &&
      blocks[b].len === clues[clueIdx]
    ) {
      blocks[b].assignedClueIdx = clueIdx;
      marked[clueIdx] = true;
      assignedBlocks.push({ clueIdx, start: blocks[b].start, end: blocks[b].end });
      clueIdx--;
    } else break;
  }

  for (let b = 0; b < blocks.length; b++) {
    if (blocks[b].isFullyBounded && blocks[b].assignedClueIdx === -1) {
      const blockLen = blocks[b].len;
      const matchingClues = [];
      for (let i = 0; i < clues.length; i++) {
        if (clues[i] === blockLen) matchingClues.push(i);
      }
      if (matchingClues.length === 1) {
        const targetClueIdx = matchingClues[0];
        if (!marked[targetClueIdx]) {
          blocks[b].assignedClueIdx = targetClueIdx;
          marked[targetClueIdx] = true;
          assignedBlocks.push({
            clueIdx: targetClueIdx,
            start: blocks[b].start,
            end: blocks[b].end,
          });
        }
      }
    }
  }
  return { marked, assignedBlocks };
};

/**
 * 根据鼠标位置与已确认块，估算线索数字的插入位置。
 * 注意：不修改传入的 assignedBlocks。
 */
export const getInsertIdx = (lineLength, clues, mouseIdx, assignedBlocks) => {
  if (!clues || clues.length === 0 || clues[0] === 0) return 0;
  const sorted = [...assignedBlocks].sort((a, b) => a.start - b.start);

  let leftBlock = null;
  let rightBlock = null;
  for (const b of sorted) {
    if (b.end < mouseIdx && (!leftBlock || b.end > leftBlock.end)) leftBlock = b;
    if (b.start > mouseIdx && (!rightBlock || b.start < rightBlock.start)) rightBlock = b;
  }
  for (const b of sorted) {
    if (mouseIdx >= b.start && mouseIdx <= b.end) return b.clueIdx + 1;
  }

  const minCIdx = leftBlock ? leftBlock.clueIdx + 1 : 0;
  const maxCIdx = rightBlock ? rightBlock.clueIdx : clues.length;
  if (minCIdx >= maxCIdx) return minCIdx;

  const leftEnd = leftBlock ? leftBlock.end : -1;
  const rightStart = rightBlock ? rightBlock.start : lineLength;
  const physicalGap = rightStart - leftEnd;
  const offset = mouseIdx - leftEnd;
  const ratio = offset / physicalGap;

  const clueGapCount = maxCIdx - minCIdx;
  let insertIdx = minCIdx + Math.round(ratio * clueGapCount);
  if (insertIdx < minCIdx) insertIdx = minCIdx;
  if (insertIdx > maxCIdx) insertIdx = maxCIdx;
  return insertIdx;
};

/** 鼠标悬停在两个未高亮数字之间时，插入点吸附到右侧最近数字 */
export const getSmartInsertIdx = (rawIdx, combinedMarked) => {
  if (combinedMarked.every((m) => !m)) return -1;
  if (
    rawIdx > 0 &&
    rawIdx < combinedMarked.length &&
    !combinedMarked[rawIdx - 1] &&
    !combinedMarked[rawIdx]
  ) {
    let snappedIdx = rawIdx;
    while (snappedIdx < combinedMarked.length && !combinedMarked[snappedIdx]) {
      snappedIdx++;
    }
    return snappedIdx;
  }
  return rawIdx;
};
