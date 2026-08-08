// 棋盘数据结构工具

export const createGrid = (rows, cols, val = 0) =>
  Array.from({ length: rows }, () => Array(cols).fill(val));

export const cloneGrid = (grid) => grid.map((row) => [...row]);

/**
 * 不可变更新单个格子：只复制目标行；值未变化时返回原引用，
 * 方便 React 跳过重渲染。
 */
export const updateCell = (grid, r, c, val) => {
  const row = grid[r];
  if (row[c] === val) return grid;
  const newGrid = grid.slice();
  newGrid[r] = row.slice();
  newGrid[r][c] = val;
  return newGrid;
};
