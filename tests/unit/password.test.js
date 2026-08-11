import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPasswordStrength } from '../../src/logic/password.js';

test('getPasswordStrength 空值 0 分', () => {
  assert.equal(getPasswordStrength(''), 0);
  assert.equal(getPasswordStrength(null), 0);
  assert.equal(getPasswordStrength(undefined), 0);
});

test('getPasswordStrength 满足全部条件为 5 分', () => {
  assert.equal(getPasswordStrength('Password123!'), 5);
});

test('getPasswordStrength 部分满足按规则计分', () => {
  assert.equal(getPasswordStrength('password123'), 2); // 长度 + 数字
  assert.equal(getPasswordStrength('12345678'), 2); // 长度 + 数字
  assert.equal(getPasswordStrength('aA1!'), 3); // 大小写 + 数字 + 特殊
  assert.equal(getPasswordStrength('abcdefghijkl'), 2); // 长度 8 + 长度 12
  assert.equal(getPasswordStrength('weak'), 0);
});
