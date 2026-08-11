import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, cloneGrid, updateCell } from '../../src/logic/board.js';

test('createGrid 生成指定尺寸的零网格', () => {
  const grid = createGrid(3, 2);
  assert.equal(grid.length, 3);
  assert.equal(grid[0].length, 2);
  assert.deepEqual(grid, [
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
});

test('createGrid 支持自定义填充值', () => {
  assert.deepEqual(createGrid(2, 2, 1), [
    [1, 1],
    [1, 1],
  ]);
});

test('cloneGrid 深拷贝，修改副本不影响原网格', () => {
  const grid = createGrid(2, 2);
  const clone = cloneGrid(grid);
  clone[0][0] = 9;
  assert.equal(grid[0][0], 0);
  assert.notEqual(clone, grid);
  assert.notEqual(clone[0], grid[0]);
});

test('updateCell 值未变化时返回原引用', () => {
  const grid = createGrid(2, 2);
  assert.equal(updateCell(grid, 0, 0, 0), grid);
});

test('updateCell 不可变更新单个格子', () => {
  const grid = createGrid(2, 2);
  const next = updateCell(grid, 1, 1, 1);
  assert.deepEqual(next, [
    [0, 0],
    [0, 1],
  ]);
  assert.equal(grid[1][1], 0);
  assert.equal(next[0], grid[0]); // 未改动的行复用引用
});
