import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseClue,
  getLineClue,
  arraysEqual,
  isLineCompleted,
  normalizeLine,
  getAutoMarked,
  getInsertIdx,
  getSmartInsertIdx,
} from '../../src/logic/clues.js';

test('parseClue 支持空格/逗号/换行分隔', () => {
  assert.deepEqual(parseClue('1 2 3'), [1, 2, 3]);
  assert.deepEqual(parseClue('1,2\n3'), [1, 2, 3]);
  assert.deepEqual(parseClue('  1 2 '), [1, 2]);
});

test('parseClue 空串/非法输入回退为 [0]', () => {
  assert.deepEqual(parseClue(''), [0]);
  assert.deepEqual(parseClue('   '), [0]);
  assert.deepEqual(parseClue('0'), [0]);
  assert.deepEqual(parseClue(null), [0]);
  assert.deepEqual(parseClue(123), [0]);
});

test('getLineClue 提取连续黑块', () => {
  assert.deepEqual(getLineClue([1, 0, 1, 1, 0]), [1, 2]);
  assert.deepEqual(getLineClue([1, 1, 1]), [3]);
  assert.deepEqual(getLineClue([0, 0, 0]), [0]);
  assert.deepEqual(getLineClue([]), [0]);
});

test('getLineClue 推演色按奇偶归并为黑/白', () => {
  // 3/4 视为第 1 级推演的填/叉：填叉填是两个独立块
  assert.deepEqual(getLineClue([3, 4, 3]), [1, 1]);
  assert.deepEqual(getLineClue([4, 4]), [0]);
});

test('arraysEqual 与 isLineCompleted', () => {
  assert.equal(arraysEqual([1, 2], [1, 2]), true);
  assert.equal(arraysEqual([1, 2], [2, 1]), false);
  assert.equal(arraysEqual([1], [1, 2]), false);
  assert.equal(isLineCompleted([1, 0, 1, 1, 0], [1, 2]), true);
  assert.equal(isLineCompleted([1, 0, 1, 1, 0], [2, 1]), false);
});

test('normalizeLine 归一行状态', () => {
  assert.deepEqual(normalizeLine([1, 2, 3, 4, 0]), [1, 2, 1, 2, 0]);
});

test('getAutoMarked 首尾完全确定的块被标记', () => {
  const line = [1, 1, 2, 2, 1];
  const clues = [2, 1];
  const { marked, assignedBlocks } = getAutoMarked(line, clues);
  assert.deepEqual(marked, [true, true]);
  assert.equal(assignedBlocks.length, 2);
});

test('getAutoMarked 唯一长度匹配的中间块被标记', () => {
  // 中间块长度 1 在线索中只出现一次，且两侧已打叉
  const line = [2, 1, 2, 2, 2];
  const clues = [3, 1];
  const { marked } = getAutoMarked(line, clues);
  assert.deepEqual(marked, [false, true]);
});

test('getInsertIdx 在已标记块内返回其线索下标 +1', () => {
  const assignedBlocks = [{ clueIdx: 0, start: 0, end: 1 }];
  assert.equal(getInsertIdx(5, [2, 1], 1, assignedBlocks), 1);
});

test('getSmartInsertIdx 吸附到右侧最近的未标记数字', () => {
  // 两侧都未标记时吸附到右侧最近未标记
  assert.equal(getSmartInsertIdx(1, [false, false, false, true]), 3);
  // 左侧已标记时不吸附
  assert.equal(getSmartInsertIdx(1, [true, false, false, true]), 1);
  // 起点不吸附
  assert.equal(getSmartInsertIdx(0, [true, false, false, true]), 0);
  // 全未标记返回 -1
  assert.equal(getSmartInsertIdx(2, [false, false, false]), -1);
});
