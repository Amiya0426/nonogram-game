import { DEFAULT_THEME } from '../constants.js';
import { useI18n } from '../i18n/index.js';

const renderTooltipClues = (parsed, autoMarked, manualMarkedDict, insertIdx, keyPrefix) => {
  const els = [];
  for (let i = 0; i <= parsed.length; i++) {
    if (i === insertIdx) {
      els.push(
        <span key={`cursor-${keyPrefix}-${i}`} className="text-cyan-400 mx-1 animate-pulse drop-shadow-md">
          !
        </span>,
      );
    }
    if (i < parsed.length) {
      const isMarked = manualMarkedDict[`${keyPrefix}-${i}`] || autoMarked[i];
      els.push(
        <span key={`clue-${keyPrefix}-${i}`} style={{ color: isMarked ? DEFAULT_THEME.marked : '#f1f5f9' }}>
          {parsed[i]}
        </span>,
      );
    }
  }
  return els;
};

/** 测量与悬浮线索提示框（位置由全局 mousemove 直接驱动 DOM） */
const MeasureTooltip = ({
  showTooltip,
  showMeasure,
  measureStart,
  hoverPos,
  showHoverRow,
  showHoverCol,
  hoverOnlyRow,
  hoverOnlyCol,
  row,
  col,
  markedRowClues,
  markedColClues,
}) => {
  const { t } = useI18n();
  return (
    <div
      id="measure-tooltip-container"
      className="fixed pointer-events-none z-50 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl"
      style={{
        display: showTooltip ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '4px',
        top: 0,
        left: 0,
      }}
    >
      {showMeasure && (
        <div className="text-amber-300 border-b border-white/20 pb-1 mb-1">
          {Math.abs(hoverPos.r - measureStart.r) + 1 > 1 &&
          Math.abs(hoverPos.c - measureStart.c) + 1 > 1
            ? `📐 ${Math.abs(hoverPos.r - measureStart.r) + 1} × ${Math.abs(hoverPos.c - measureStart.c) + 1} ${t('tooltip.cells')}`
            : `📐 ${Math.max(Math.abs(hoverPos.r - measureStart.r) + 1, Math.abs(hoverPos.c - measureStart.c) + 1)} ${t('tooltip.cells')}`}
        </div>
      )}
      {showHoverRow && row && (
        <div className={`flex items-center ${hoverOnlyRow ? 'text-3xl font-black gap-2' : 'text-base font-bold gap-1'}`}>
          {!hoverOnlyRow && <span className="text-slate-400 font-normal text-xs mr-1">{t('tooltip.rowLabel')}</span>}
          {renderTooltipClues(row.parsed, row.autoMarked, markedRowClues, row.insertIdx, hoverPos.r)}
        </div>
      )}
      {showHoverCol && col && (
        <div className={`flex items-center ${hoverOnlyCol ? 'text-3xl font-black gap-2' : 'text-base font-bold gap-1'}`}>
          {!hoverOnlyCol && <span className="text-slate-400 font-normal text-xs mr-1">{t('tooltip.colLabel')}</span>}
          {renderTooltipClues(col.parsed, col.autoMarked, markedColClues, col.insertIdx, hoverPos.c)}
        </div>
      )}
    </div>
  );
};

export default MeasureTooltip;
