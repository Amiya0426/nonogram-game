import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBorderColorClass,
  getContainerBgClass,
  getBorderBaseClass,
  getHoverBgClass,
} from '../../src/logic/theme.js';

test('getBorderColorClass 各级别返回对应颜色', () => {
  assert.match(getBorderColorClass(1), /fuchsia-600/);
  assert.match(getBorderColorClass(2), /blue-500/);
  assert.match(getBorderColorClass(3), /amber-400/);
  assert.match(getBorderColorClass(0), /slate-800/);
});

test('getContainerBgClass 各级别返回对应背景', () => {
  assert.match(getContainerBgClass(1), /fuchsia/);
  assert.match(getContainerBgClass(2), /blue/);
  assert.match(getContainerBgClass(3), /amber/);
  assert.equal(getContainerBgClass(0), '');
});

test('getBorderBaseClass 各级别返回对应边框', () => {
  assert.match(getBorderBaseClass(1), /fuchsia-600/);
  assert.match(getBorderBaseClass(2), /blue-500/);
  assert.match(getBorderBaseClass(3), /amber-400/);
  assert.match(getBorderBaseClass(0), /slate-800/);
});

test('getHoverBgClass 各级别返回对应悬停背景', () => {
  assert.match(getHoverBgClass(1), /fuchsia-100/);
  assert.match(getHoverBgClass(2), /blue-100/);
  assert.match(getHoverBgClass(3), /amber-100/);
  assert.match(getHoverBgClass(0), /#e0f2e9/);
});
