import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveBoard } from '../../src/logic/solver.js';
import { getLineClue } from '../../src/logic/clues.js';
import { countSolutions } from '../../server/puzzle-lib.js';
import { PRESETS } from '../../src/constants.js';

/** 校验盘面与行列线索一致 */
const assertBoardMatches = (board, rowClues, colClues) => {
  for (let r = 0; r < rowClues.length; r++) {
    assert.deepEqual(getLineClue(board[r]), rowClues[r], `row ${r} mismatch`);
  }
  for (let c = 0; c < colClues.length; c++) {
    const line = board.map((row) => row[c]);
    assert.deepEqual(getLineClue(line), colClues[c], `col ${c} mismatch`);
  }
};

test('solveBoard 心形预设题完整求解', () => {
  const { rows, cols, rowClues, colClues } = PRESETS.heart;
  const res = solveBoard(rowClues, colClues, rows, cols);
  assert.notEqual(res, null);
  assert.equal(res.complete, true);
  assertBoardMatches(res.board, rowClues, colClues);
});

test('solveBoard webpbn#304 完整求解', () => {
  const rowClues = [[1, 1], [1, 1, 1], [1, 1], [1, 1], [1]];
  const colClues = [[2], [1, 1], [1, 1], [1, 1], [2]];
  const res = solveBoard(rowClues, colClues, 5, 5);
  assert.notEqual(res, null);
  assert.equal(res.complete, true);
  assertBoardMatches(res.board, rowClues, colClues);
});

test('solveBoard 纯逻辑推不动的 10x10 硬题也能完整求解（回归：一键解题历史盲区）', () => {
  const rowClues = [
    [1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 2],
    [1, 1, 1, 1, 1],
    [2, 1, 2],
    [2, 2, 2],
    [2, 2, 1],
    [1, 1, 1],
    [1],
  ];
  const colClues = Array(10).fill([4]);
  const res = solveBoard(rowClues, colClues, 10, 10);
  assert.notEqual(res, null);
  assert.equal(res.complete, true);
  assertBoardMatches(res.board, rowClues, colClues);
  // 该题本身是唯一解（防止测试数据被误判）
  const sol = countSolutions({ rows: 10, cols: 10, rowClues, colClues });
  assert.equal(sol.count, 1);
});

test('solveBoard 矛盾线索返回 null', () => {
  const res = solveBoard([[1], [1]], [[2], [2]], 2, 2);
  assert.equal(res, null);
});

test('solveBoard 多解题也返回一个合法解', () => {
  const rowClues = [[1], [1], [1]];
  const colClues = [[1], [1], [1]];
  const res = solveBoard(rowClues, colClues, 3, 3);
  assert.notEqual(res, null);
  assert.equal(res.complete, true);
  assertBoardMatches(res.board, rowClues, colClues);
});
