import { useState } from 'react';
import { Minus, Plus, RefreshCw, FileMinus, Maximize, PencilLine, Library } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

/** 棋盘设置区（非折叠）：行列尺寸、随机/清线索、缩放与适配、自定义题目 + 题库浏览入口 */
const SidePanelViewSettings = ({
  mode,
  rows,
  cols,
  onInitBoard,
  onGenerateRandom,
  onClearClues,
  cellSize,
  setCellSize,
  onFitToWidth,
  onModeChange,
  onOpenBrowse,
}) => {
  const { t } = useI18n();
  const [rowText, setRowText] = useState(String(rows));
  const [colText, setColText] = useState(String(cols));
  const [prevRows, setPrevRows] = useState(rows);
  const [prevCols, setPrevCols] = useState(cols);
  if (prevRows !== rows) {
    setPrevRows(rows);
    setRowText(String(rows));
  }
  if (prevCols !== cols) {
    setPrevCols(cols);
    setColText(String(cols));
  }

  const clampBoard = (v) => Math.max(1, Math.min(80, v));
  const commitRow = () => {
    onInitBoard(clampBoard(parseInt(rowText, 10) || 1), cols);
  };
  const commitCol = () => {
    onInitBoard(rows, clampBoard(parseInt(colText, 10) || 1));
  };
  const stepRow = (delta) => {
    const base = parseInt(rowText, 10);
    onInitBoard(clampBoard((Number.isNaN(base) ? rows : base) + delta), cols);
  };
  const stepCol = (delta) => {
    const base = parseInt(colText, 10);
    onInitBoard(rows, clampBoard((Number.isNaN(base) ? cols : base) + delta));
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 shrink-0">
      {/* 行列设置 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-500">{t('panel.rowsLabel')}</label>
          <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => stepRow(-1)}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
              title={t('panel.decreaseRows')}
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              min="1"
              max="80"
              aria-label={t('panel.rowsLabel')}
              value={rowText}
              onChange={(e) => setRowText(e.target.value)}
              onBlur={commitRow}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitRow();
                  e.currentTarget.blur();
                }
              }}
              onWheel={(e) => (e.deltaY < 0 ? stepRow(1) : stepRow(-1))}
              className="w-11 px-0.5 py-1 text-xs outline-none focus:bg-indigo-50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => stepRow(1)}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
              title={t('panel.increaseRows')}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <span className="text-slate-300 text-xs">×</span>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-500">{t('panel.colsLabel')}</label>
          <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => stepCol(-1)}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
              title={t('panel.decreaseCols')}
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              min="1"
              max="80"
              aria-label={t('panel.colsLabel')}
              value={colText}
              onChange={(e) => setColText(e.target.value)}
              onBlur={commitCol}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitCol();
                  e.currentTarget.blur();
                }
              }}
              onWheel={(e) => (e.deltaY < 0 ? stepCol(1) : stepCol(-1))}
              className="w-11 px-0.5 py-1 text-xs outline-none focus:bg-indigo-50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => stepCol(1)}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
              title={t('panel.increaseCols')}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex ml-auto gap-1">
          <button
            data-testid="random-btn"
            onClick={onGenerateRandom}
            className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded transition-colors"
            title={t('panel.randomGenerate')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {mode === 'edit' && (
            <button
              onClick={onClearClues}
              className="p-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
              title={t('panel.clearClues')}
            >
              <FileMinus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 缩放 */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{t('panel.zoom')}</span>
        <div className="flex items-center gap-2 flex-1 ml-2">
          <input
            type="range"
            min="12"
            max="80"
            aria-label={t('panel.zoom')}
            value={cellSize}
            onChange={(e) => setCellSize(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-ew-resize"
          />
          <button
            onClick={onFitToWidth}
            className="p-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors border border-indigo-100"
            title={t('panel.fitWidth')}
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 自定义题目 + 题库浏览（左右并列，仅游玩模式） */}
      {mode === 'play' && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => onModeChange('edit')}
            className="py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-orange-200 transition-colors"
            title={t('panel.createPuzzleTitle')}
          >
            <PencilLine className="w-3.5 h-3.5" /> {t('panel.customTitle')}
          </button>
          <button
            data-testid="browse-btn"
            onClick={onOpenBrowse}
            className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors"
          >
            <Library className="w-3.5 h-3.5" /> {t('panel.browse')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SidePanelViewSettings;
