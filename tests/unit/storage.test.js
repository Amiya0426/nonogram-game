import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage 垫片：storage.js 仅在函数内访问全局 localStorage
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { loadJSON, saveJSON } = await import('../../src/logic/storage.js');

test('saveJSON/loadJSON 往返一致', () => {
  const value = { a: 1, grid: [[0, 1], [1, 0]] };
  saveJSON('k1', value);
  assert.deepEqual(loadJSON('k1', null), value);
});

test('loadJSON 缺失键返回 fallback', () => {
  assert.equal(loadJSON('missing-key', 42), 42);
});

test('loadJSON 损坏 JSON 返回 fallback 且不抛错', () => {
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    store.set('corrupt', '{not json');
    assert.equal(loadJSON('corrupt', null), null);
  } finally {
    console.warn = origWarn;
  }
});
