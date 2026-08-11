import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions } from '../../server/puzzle-lib.js';
import { PRESETS } from '../../src/constants.js';

/**
 * 唯一解判定行为锁定测试：
 * server/puzzle-lib.js 的 countSolutions 与前端求解器共用 shared/puzzle-core.mjs，
 * 这里锁定服务端唯一解行为，防止共享核心改动导致入库判定漂移。
 */
test('心形预设题唯一解', () => {
  const { rows, cols, rowClues, colClues } = PRESETS.heart;
  const r = countSolutions({ rows, cols, rowClues, colClues });
  assert.equal(r.timeout, false);
  assert.equal(r.count, 1);
});

test('webpbn#304 线索唯一解', () => {
  const r = countSolutions({
    rows: 5,
    cols: 5,
    rowClues: [[1, 1], [1, 1, 1], [1, 1], [1, 1], [1]],
    colClues: [[2], [1, 1], [1, 1], [1, 1], [2]],
  });
  assert.equal(r.timeout, false);
  assert.equal(r.count, 1);
});

test('3x3 全 1 线索为多解题（count>=2）', () => {
  const r = countSolutions({
    rows: 3,
    cols: 3,
    rowClues: [[1], [1], [1]],
    colClues: [[1], [1], [1]],
  });
  assert.equal(r.timeout, false);
  assert.equal(r.count, 2);
});

test('矛盾线索无解', () => {
  const r = countSolutions({
    rows: 2,
    cols: 2,
    rowClues: [[1], [1]],
    colClues: [[2], [2]],
  });
  assert.equal(r.timeout, false);
  assert.equal(r.count, 0);
});
