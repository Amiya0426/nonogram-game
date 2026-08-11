import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimestamp,
  buildPuzzleExportName,
  sanitizeFilename,
  computePuzzleProgress,
  buildExportData,
  buildExportCode,
  decodeExportCode,
} from '../../src/logic/exporter.js';

test('formatTimestamp 输出 YYYY-MM-DD_HH-mm', () => {
  assert.match(formatTimestamp(new Date(2026, 7, 11, 9, 5)), /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/);
});

test('buildPuzzleExportName 含尺寸与进度', () => {
  assert.match(buildPuzzleExportName({ rows: 5, cols: 10, progressPercent: 100 }), /_10x5_100%$/);
});

test('sanitizeFilename 替换非法字符', () => {
  assert.equal(sanitizeFilename('a/b\\c:d*e?"f<g>h|i'), 'a_b_c_d_e__f_g_h_i');
  assert.equal(sanitizeFilename('   '), 'unnamed');
});

test('computePuzzleProgress 已完成返回 100，未完成按行/列比例', () => {
  const solved = {
    rows: 2,
    cols: 2,
    rowCluesStr: ['1', '1'],
    colCluesStr: ['1', '1'],
    grid: [[1, 0], [0, 1]],
  };
  assert.equal(computePuzzleProgress(solved), 100);

  const empty = {
    rows: 2,
    cols: 2,
    rowCluesStr: ['1', '1'],
    colCluesStr: ['1', '1'],
    grid: [[0, 0], [0, 0]],
  };
  assert.equal(computePuzzleProgress(empty), 0);
  assert.equal(computePuzzleProgress(null), 0);
});

test('buildExportData 包含存档字段', () => {
  const data = buildExportData(
    {
      rows: 2,
      cols: 2,
      rowCluesStr: ['1', '1'],
      colCluesStr: ['1', '1'],
      grid: [[1, 0], [0, 1]],
      markedRowClues: {},
      markedColClues: {},
      isSolvedStatus: false,
      deductionLevel: 0,
      backupGrids: [],
    },
    '  备注  ',
  );
  assert.equal(data.rows, 2);
  assert.equal(data.remark, '备注');
  assert.deepEqual(data.grid, [[1, 0], [0, 1]]);
});

test('buildExportCode/decodeExportCode v2 往返一致', () => {
  const state = {
    rows: 2,
    cols: 2,
    rowCluesStr: ['1', '1'],
    colCluesStr: ['1', '1'],
    grid: [[1, 0], [0, 1]],
    markedRowClues: { '0-0': true },
    markedColClues: {},
    isSolvedStatus: true,
    deductionLevel: 1,
  };
  const code = buildExportCode(state, ' 我的备注 ');
  assert.ok(code.startsWith('v2:'));
  const decoded = decodeExportCode(code);
  assert.equal(decoded.rows, 2);
  assert.equal(decoded.cols, 2);
  assert.deepEqual(decoded.grid, [[1, 0], [0, 1]]);
  assert.deepEqual(decoded.rowCluesStr, ['1', '1']);
  assert.deepEqual(decoded.markedRowClues, { '0-0': true });
  assert.equal(decoded.isSolvedStatus, true);
  assert.equal(decoded.deductionLevel, 1);
  assert.equal(decoded.remark, '我的备注');
});

test('decodeExportCode 兼容旧版 base64(encodeURIComponent(JSON))', () => {
  const data = {
    rows: 2,
    cols: 2,
    rowCluesStr: ['1', '1'],
    colCluesStr: ['1', '1'],
    grid: [[1, 0], [0, 1]],
  };
  const code = btoa(encodeURIComponent(JSON.stringify(data)));
  const decoded = decodeExportCode(code);
  assert.equal(decoded.rows, 2);
  assert.deepEqual(decoded.grid, [[1, 0], [0, 1]]);
});

test('decodeExportCode 损坏代码抛出', () => {
  assert.throws(() => decodeExportCode('v2:not-valid-base64!!!'), /存档代码已损坏|Invalid character/);
});
