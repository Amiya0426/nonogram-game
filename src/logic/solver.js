// 数织求解器：核心实现位于 shared/puzzle-core.mjs（前后端唯一真源）
import { canFit, solveLineFast, propagateBoard, solveBoard } from '../../shared/puzzle-core.mjs';
import { parseClue } from './clues.js';

export { canFit, solveLineFast, solveBoard };

/**
 * 整盘逻辑传播求解（行/列队列交替推导），返回 -1/0/1 盘面或 null（矛盾）。
 * 前端沿用 200 次迭代上限。
 */
export const solveBoardLogic = (rClues, cClues, rCount, cCount) =>
  propagateBoard(
    rClues.map(parseClue),
    cClues.map(parseClue),
    rCount,
    cCount,
    200,
  );
