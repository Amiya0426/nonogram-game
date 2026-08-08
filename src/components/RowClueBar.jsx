import { memo } from 'react';
import { DEFAULT_THEME } from '../constants.js';
import { getHoverBgClass, getBorderBaseClass } from '../logic/theme.js';

/**
 * 行线索条（左侧 / 右侧），memo 化。
 * markedFlags 等均为基础类型数组，hover 时只有对应行会重渲染。
 */
const RowClueBar = ({
  r,
  position,
  mode,
  editInputMode,
  clueTextSize,
  parsed,
  previewClues,
  completed,
  isHovered,
  isHintRow,
  hintError,
  deductionLevel,
  markedFlags,
  sum,
  showClueSums,
  completeLineStyle,
  editValue,
  onEditClue,
  onClueMouseDown,
  hasBottomBorder,
}) => {
  const borderBase = getBorderBaseClass(deductionLevel);
  let bgClass = '';
  let bgStyle = null;

  if (isHintRow) {
    bgClass = hintError ? 'bg-red-100' : 'bg-amber-100/80';
  } else if (isHovered) {
    if (deductionLevel > 0) bgClass = getHoverBgClass(deductionLevel);
    else bgStyle = { backgroundColor: DEFAULT_THEME.hoverBg };
  } else if (completed && completeLineStyle === 'highlight') {
    bgStyle = { backgroundColor: DEFAULT_THEME.completeBg };
  } else if (mode === 'edit' && editInputMode === 'pattern') {
    bgClass = 'bg-orange-50/70';
  } else {
    bgClass = 'bg-slate-50';
  }

  const isLeft = position === 'left';

  return (
    <div
      className={`
        relative flex items-center gap-1.5
        ${isLeft ? 'justify-end pr-2 border-r-2' : 'justify-start pl-2 border-l-2'}
        ${borderBase}
        ${hasBottomBorder ? `border-b-2 ${borderBase}` : ''}
        ${bgClass}
        ${completed && completeLineStyle === 'fade' ? 'opacity-30' : ''}
      `}
      style={bgStyle}
    >
      {mode === 'play' && showClueSums && sum > 0 && (
        <span
          className={`absolute top-0.5 ${isLeft ? 'left-0.5' : 'right-0.5'} text-[11px] text-blue-500 font-bold leading-none pointer-events-none`}
          title="剩余线索和 (非高亮数字之和)"
        >
          {sum}
        </span>
      )}

      {mode === 'edit' ? (
        editInputMode === 'pattern' ? (
          (previewClues || []).map((num, i) => (
            <span key={i} className={`${clueTextSize} font-black leading-tight text-orange-800`}>
              {num}
            </span>
          ))
        ) : isLeft ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditClue(r, e.target.value)}
            className={`w-24 text-right ${clueTextSize} font-black bg-orange-100 hover:bg-orange-200 outline-none text-orange-900 px-1 py-0.5 rounded focus:bg-white`}
            placeholder="0"
          />
        ) : (
          <span className="text-slate-300 px-4 text-xs font-medium">镜像</span>
        )
      ) : (
        parsed.map((num, i) => (
          <span
            key={i}
            onMouseDown={(e) => {
              e.stopPropagation();
              onClueMouseDown(r, i);
            }}
            className={`cursor-pointer transition-colors ${clueTextSize} font-black leading-tight hover:opacity-70`}
            style={{
              color:
                num === 0
                  ? 'transparent'
                  : markedFlags[i]
                    ? DEFAULT_THEME.marked
                    : isHintRow
                      ? '#78350f'
                      : '#1e293b',
            }}
          >
            {num}
          </span>
        ))
      )}
    </div>
  );
};

export default memo(RowClueBar);
