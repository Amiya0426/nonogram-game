import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPuzzleFromHtml, normalizePuzzleData, parseCollectionItem } from '../../src/logic/importer.js';

test('extractPuzzleFromHtml 解析 task 变量格式（列线索在前）', () => {
  const html = [
    'var puzzle = {',
    "  task: '2/1.1/1.1/1.1/2/1.1/1.1.1/1.1/1.1/1',",
    '  puzzleWidth: 5,',
    '  puzzleHeight: 5',
    '};',
  ].join('\n');
  const puzzle = extractPuzzleFromHtml(html);
  assert.equal(puzzle.rows, 5);
  assert.equal(puzzle.cols, 5);
  assert.deepEqual(puzzle.colClues, [[2], [1, 1], [1, 1], [1, 1], [2]]);
  assert.deepEqual(puzzle.rowClues, [[1, 1], [1, 1, 1], [1, 1], [1, 1], [1]]);
});

test('extractPuzzleFromHtml 无法识别时抛出 parseFailed', () => {
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    assert.throws(() => extractPuzzleFromHtml('<div>not a puzzle</div>'), /import\.parseFailed/);
  } finally {
    console.warn = origWarn;
  }
});

test('normalizePuzzleData 数组取第一个合法题目', () => {
  const item = {
    rows: 2,
    cols: 2,
    rowCluesStr: ['1', '1'],
    colCluesStr: ['1', '1'],
    grid: [[1, 0], [0, 1]],
  };
  const data = normalizePuzzleData([{ bad: true }, item]);
  assert.equal(data, item);
});

test('normalizePuzzleData 数组无合法项时抛出', () => {
  assert.throws(() => normalizePuzzleData([{ bad: true }]), /import\.incomplete/);
  assert.throws(() => normalizePuzzleData([]), /import\.incomplete/);
});

test('normalizePuzzleData 非数组原样返回', () => {
  const data = { rows: 2 };
  assert.equal(normalizePuzzleData(data), data);
});

test('parseCollectionItem 解析完整收藏条目', () => {
  const text = JSON.stringify({
    name: '测试题',
    rows: 2,
    cols: 2,
    rowCluesStr: ['1', '1'],
    colCluesStr: ['1', '1'],
    grid: [[1, 0], [0, 1]],
    markedRowClues: { '0-0': true },
    deductionLevel: 1,
  });
  const item = parseCollectionItem(text, 'fallback.json');
  assert.equal(item.name, '测试题');
  assert.equal(item.rows, 2);
  assert.equal(item.markedRowClues['0-0'], true);
  assert.equal(item.deductionLevel, 1);
});

test('parseCollectionItem 无 name 时用文件名兜底', () => {
  const text = JSON.stringify({
    rows: 2,
    cols: 2,
    rowCluesStr: ['1', '1'],
    colCluesStr: ['1', '1'],
    grid: [[1, 0], [0, 1]],
  });
  const item = parseCollectionItem(text, 'my-puzzle.json');
  assert.equal(item.name, 'my-puzzle');
});

test('parseCollectionItem 缺少 grid 时抛出', () => {
  const text = JSON.stringify({ rows: 2, cols: 2, rowCluesStr: ['1', '1'], colCluesStr: ['1', '1'] });
  assert.throws(() => parseCollectionItem(text, 'x.json'), /import\.incomplete/);
});
