import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canFit, solveLineFast, solveBoardLogic } from '../../src/logic/solver.js';
import { PRESETS } from '../../src/constants.js';

test('canFit 判断部分行是否可能满足线索', () => {
  assert.equal(canFit([-1, -1, -1], [3]), true);
  assert.equal(canFit([0, 0, 0], [1]), false);
  assert.equal(canFit([-1, 0, -1], [1]), true);
  assert.equal(canFit([0, -1, 0], [2]), false);
  assert.equal(canFit([1, 1, 0, -1], [2]), true);
  assert.equal(canFit([1, 0, 1], [2]), false);
});

test('solveLineFast 满行可确定全部格子', () => {
  const res = solveLineFast([-1, -1, -1], [3]);
  assert.deepEqual(res.newLine, [1, 1, 1]);
  assert.equal(res.changed, true);
});

test('solveLineFast 间隔线索确定中间空位', () => {
  const res = solveLineFast([-1, -1, -1], [1, 1]);
  assert.equal(res.newLine[1], 0);
  assert.equal(res.newLine[0], 1);
  assert.equal(res.newLine[2], 1);
});

test('solveLineFast 矛盾线索返回 null', () => {
  assert.equal(solveLineFast([0, -1, 0], [2]), null);
  assert.equal(solveLineFast([0, 0, 0], [1]), null);
});

test('solveLineFast 已满足的行不产生变化', () => {
  const res = solveLineFast([1, 0, 1], [1, 1]);
  assert.equal(res.changed, false);
  assert.deepEqual(res.newLine, [1, 0, 1]);
});

test('solveBoardLogic 求解心形预设题', () => {
  const { rows, cols, rowClues, colClues } = PRESETS.heart;
  const board = solveBoardLogic(
    rowClues.map((c) => c.join(' ')),
    colClues.map((c) => c.join('\n')),
    rows,
    cols,
  );
  assert.notEqual(board, null);
  // 心形题可通过单行/单列逻辑完全确定
  assert.equal(board.every((row) => row.every((v) => v !== -1)), true);
});

test('solveBoardLogic 求解已知 5x5 题（webpbn#304 线索）', () => {
  const rowCluesStr = ['1 1', '1 1 1', '1 1', '1 1', '1'];
  const colCluesStr = ['2', '1 1', '1 1', '1 1', '2'];
  const board = solveBoardLogic(rowCluesStr, colCluesStr, 5, 5);
  assert.notEqual(board, null);
  // 该题预期可被逻辑传播完整求解（与 e2e-autosolve 一致）
  assert.equal(board.every((row) => row.every((v) => v !== -1)), true);
});

test('solveBoardLogic 矛盾线索返回 null', () => {
  const board = solveBoardLogic(['2', '2', '2'], ['3', '3', '3'], 3, 3);
  assert.equal(board, null);
});
