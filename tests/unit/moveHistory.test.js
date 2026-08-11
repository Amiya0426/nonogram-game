import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeCells, appendMove } from '../../src/logic/moveHistory.js';

test('dedupeCells 同格重复操作取最后值', () => {
  assert.deepEqual(
    dedupeCells([
      { r: 0, c: 0, val: 1 },
      { r: 1, c: 1, val: 1 },
      { r: 0, c: 0, val: 2 },
    ]),
    [
      { r: 0, c: 0, val: 2 },
      { r: 1, c: 1, val: 1 },
    ],
  );
});

test('appendMove 空格子返回原数组引用', () => {
  const prev = [{ type: 'fill', at: 1, cells: [{ r: 0, c: 0, val: 1 }] }];
  assert.equal(appendMove(prev, 'fill', []), prev);
});

test('appendMove 追加新记录', () => {
  const prev = [];
  const next = appendMove(prev, 'fill', [{ r: 0, c: 0, val: 1 }]);
  assert.equal(next.length, 1);
  assert.equal(next[0].type, 'fill');
  assert.equal(typeof next[0].at, 'number');
  assert.deepEqual(next[0].cells, [{ r: 0, c: 0, val: 1 }]);
});

test('appendMove 同格连续 fill 合并为一条（取最终值）', () => {
  const prev = [{ type: 'fill', at: 100, cells: [{ r: 0, c: 0, val: 1 }] }];
  const next = appendMove(prev, 'fill', [{ r: 0, c: 0, val: 2 }]);
  assert.equal(next.length, 1);
  assert.equal(next[0].at, 100);
  assert.deepEqual(next[0].cells, [{ r: 0, c: 0, val: 2 }]);
});

test('appendMove 不同格子不合并', () => {
  const prev = [{ type: 'fill', at: 100, cells: [{ r: 0, c: 0, val: 1 }] }];
  const next = appendMove(prev, 'fill', [{ r: 1, c: 1, val: 1 }]);
  assert.equal(next.length, 2);
});

test('appendMove 非 fill 类型不合并', () => {
  const prev = [{ type: 'fill', at: 100, cells: [{ r: 0, c: 0, val: 1 }] }];
  const next = appendMove(prev, 'deduct', [{ r: 0, c: 0, val: 3 }]);
  assert.equal(next.length, 2);
  assert.equal(next[1].type, 'deduct');
});

test('appendMove 多格批量记录不合并', () => {
  const prev = [{ type: 'fill', at: 100, cells: [{ r: 0, c: 0, val: 1 }] }];
  const next = appendMove(prev, 'fill', [
    { r: 0, c: 0, val: 2 },
    { r: 1, c: 0, val: 1 },
  ]);
  assert.equal(next.length, 2);
  assert.equal(next[1].cells.length, 2);
});
