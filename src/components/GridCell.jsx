import { memo } from 'react';
import { DEFAULT_THEME } from '../constants.js';
import { getHoverBgClass, getBorderBaseClass } from '../logic/theme.js';

const getCrossColor = (val, isExactError) => {
  if (isExactError) return '#7f1d1d';
  if (val === 2) return DEFAULT_THEME.cross;
  if (val === 4) return '#d946ef';
  if (val === 6) return '#3b82f6';
  if (val === 8) return '#f59e0b';
  return DEFAULT_THEME.cross;
};

/**
 * 单个棋盘格（memo 化）。
 * 全部使用基础类型 props，hover / 填格只会重渲染发生变化的格子。
 */
const GridCell = ({
  r,
  c,
  value,
  size,
  editable,
  deductionLevel,
  isHovered,
  isHintRow,
  isHintCol,
  hintError,
  isExactError,
  inMeasureRect,
  hasRightBorder,
  hasBottomBorder,
}) => {
  const isHintCell = isHintRow || isHintCol;
  const isCross = value > 0 && value % 2 === 0;
  const borderBase = getBorderBaseClass(deductionLevel);

  let bgClass = '';
  let bgStyle = null;

  if (isExactError) {
    bgClass = value % 2 === 1 ? 'bg-red-700 animate-pulse' : 'bg-red-300 animate-pulse';
  } else if (inMeasureRect) {
    bgClass = value % 2 === 1 ? 'bg-indigo-800' : 'bg-indigo-100/70';
  } else if (isHintCell) {
    bgClass = hintError ? 'bg-red-200' : 'bg-amber-100';
  } else if (isHovered) {
    if (deductionLevel > 0) bgClass = getHoverBgClass(deductionLevel);
    else bgStyle = { backgroundColor: DEFAULT_THEME.hoverBg };
  } else {
    bgClass = 'bg-white';
  }

  // 盘面值颜色（优先级最低，与原始顺序一致）
  if (!isExactError && !inMeasureRect) {
    if (value === 1) {
      bgClass = '';
      bgStyle = { backgroundColor: DEFAULT_THEME.fill };
    } else if (value === 3) bgClass = 'bg-fuchsia-600';
    else if (value === 5) bgClass = 'bg-blue-500';
    else if (value === 7) bgClass = 'bg-amber-400';
  }

  const hoverClass =
    editable && value % 2 === 1 && !isExactError
      ? 'hover:brightness-110'
      : editable && !inMeasureRect && !isExactError
        ? 'hover:brightness-95'
        : '';

  return (
    <div
      data-cell
      data-r={r}
      data-c={c}
      className={`
        flex items-center justify-center cursor-crosshair
        ${hasRightBorder ? `border-r-2 ${borderBase}` : ''}
        ${hasBottomBorder ? `border-b-2 ${borderBase}` : ''}
        ${editable ? '' : 'opacity-50 pointer-events-none'}
        ${bgClass} ${hoverClass}
      `}
      style={{ width: `${size}px`, height: `${size}px`, ...bgStyle }}
    >
      {isCross && (
        <span
          className="nonogram-cross"
          style={{ color: getCrossColor(value, isExactError) }}
        />
      )}
    </div>
  );
};

export default memo(GridCell);
