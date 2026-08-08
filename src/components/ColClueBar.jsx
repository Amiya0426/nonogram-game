import { memo } from 'react';
import { DEFAULT_THEME } from '../constants.js';
import { getHoverBgClass, getBorderBaseClass } from '../logic/theme.js';

/**
 * 列线索条（顶部 / 底部），memo 化。
 */
const ColClueBar = ({
  c,
  position,
  mode,
  editInputMode,
  clueTextSize,
  parsed,
  previewClues,
  completed,
  isHovered,
  isHintCol,
  hintError,
  deductionLevel,
  markedFlags,
  sum,
  showClueSums,
  completeLineStyle,
  editValue,
  onEditClue,
  onClueMouseDown,
  hasRightBorder,
}) => {
  const borderBase = getBorderBaseClass(deductionLevel);
  let bgClass = '';
  let bgStyle = null;

  if (isHintCol) {
    bgClass = hintError ? 'bg-red-200' : 'bg-amber-100';
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

  const isTop = position === 'top';

  return (
    <div
      className={`
        relative flex flex-col items-center
        ${isTop ? 'justify-end pb-2 border-b-2' : 'justify-start pt-2 border-t-2'}
        ${borderBase}
        ${hasRightBorder ? `border-r-2 ${borderBase}` : ''}
        ${bgClass}
        ${completed && completeLineStyle === 'fade' ? 'opacity-30' : ''}
      `}
      style={bgStyle}
    >
      {mode === 'play' && showClueSums && sum > 0 && (
        <span
          className={`absolute ${isTop ? 'top-0.5 left-0.5' : 'bottom-0 left-0.5'} text-[11px] text-blue-500 font-bold leading-none pointer-events-none`}
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
        ) : isTop ? (
          <textarea
            value={editValue}
            onChange={(e) => onEditClue(c, e.target.value)}
            className={`w-full text-center ${clueTextSize} font-black bg-orange-100 hover:bg-orange-200 outline-none resize-none overflow-hidden text-orange-900 leading-tight focus:bg-white`}
            rows={Math.max(4, editValue.split('\n').length)}
            placeholder="0"
          />
        ) : (
          <span className="text-slate-300 text-xs font-medium pt-2">镜像</span>
        )
      ) : (
        parsed.map((num, i) => (
          <span
            key={i}
            onMouseDown={(e) => {
              e.stopPropagation();
              onClueMouseDown(c, i);
            }}
            className={`cursor-pointer transition-colors ${clueTextSize} font-black leading-tight hover:opacity-70`}
            style={{
              color:
                num === 0
                  ? 'transparent'
                  : markedFlags[i]
                    ? DEFAULT_THEME.marked
                    : isHintCol
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

export default memo(ColClueBar);
