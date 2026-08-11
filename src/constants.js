// 全局常量与主题配置

export const DEFAULT_THEME = {
  fill: '#1e293b',       // slate-800
  cross: '#ef4444',      // red-500
  marked: '#f97316',     // orange-500
  completeBg: '#d1fae5', // emerald-100
  hoverBg: '#e0f2e9',    // 浅护眼绿
};

export const MAX_BOARD = 80;
export const MIN_CELL_SIZE = 12;
export const MAX_CELL_SIZE = 80;
export const DEFAULT_CELL_SIZE = 32;

export const DEFAULT_SETTINGS = {
  completeLineStyle: 'highlight',
  autoMarkNumbers: true,
  hoverRowClues: true,
  hoverColClues: true,
  autoFillCross: true,
  showClueSums: true,
  showTimer: true,
};

export const PRESETS = {
  heart: {
    name: '心形 (5x5)',
    rows: 5,
    cols: 5,
    rowClues: [[1, 1], [5], [5], [3], [1]],
    colClues: [[2], [4], [4], [4], [2]],
  },
};

// 推演等级对应盘面值：1 级=3/4，2 级=5/6，3 级=7/8
export const DEDUCTION_VALUES = [null, { fill: 3, cross: 4 }, { fill: 5, cross: 6 }, { fill: 7, cross: 8 }];

// 推演等级对应的填充色（奇数值）与叉色（偶数值）
export const DEDUCTION_COLORS = {
  1: { fill: '#d946ef', cross: '#d946ef' },
  2: { fill: '#3b82f6', cross: '#3b82f6' },
  3: { fill: '#f59e0b', cross: '#f59e0b' },
};
