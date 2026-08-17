import {
  MousePointerClick,
  GitBranch,
  Check,
  X,
  SearchCheck,
  Undo2,
  Lightbulb,
  Square,
  XSquare,
  Eraser,
  PaintRoller,
} from 'lucide-react';
import Accordion from './Accordion.jsx';
import { useI18n } from '../i18n/index.js';

/** 游戏控制区：推演、校验/提示、交互模式、画笔与辅助设置 */
const SidePanelGameControls = ({
  mode,
  deductionLevel,
  onStartDeduction,
  onApplyDeduction,
  onCancelDeduction,
  onValidate,
  onRestore,
  lastCorrectSnapshot,
  onProvideHint,
  interactionMode,
  setInteractionMode,
  currentBrush,
  setCurrentBrush,
  gameSettings,
  setGameSettings,
}) => {
  const { t } = useI18n();

  if (mode !== 'play') return null;

  return (
    <Accordion title={t('panel.deductionTitle')} icon={MousePointerClick} defaultOpen>
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {deductionLevel < 3 && (
            <button
              onClick={onStartDeduction}
              className={`col-span-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border
                ${deductionLevel === 0 ? 'bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border-fuchsia-200' : ''}
                ${deductionLevel === 1 ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200' : ''}
                ${deductionLevel === 2 ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200' : ''}
              `}
            >
              <GitBranch className="w-4 h-4" />
              {deductionLevel === 0
                ? t('panel.startDeduction')
                : t('panel.deepenDeduction', { n: deductionLevel + 1 })}
            </button>
          )}
          {deductionLevel > 0 && (
            <>
              <button
                onClick={onApplyDeduction}
                className="py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-emerald-200"
              >
                <Check className="w-4 h-4" /> {t('panel.applyDeduction', { n: deductionLevel })}
              </button>
              <button
                onClick={onCancelDeduction}
                className="py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-rose-200"
              >
                <X className="w-4 h-4" /> {t('panel.cancelDeduction', { n: deductionLevel })}
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onValidate}
            className="py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-blue-200"
          >
            <SearchCheck className="w-4 h-4" /> {t('panel.checkErrors')}
          </button>
          <button
            onClick={onRestore}
            disabled={!lastCorrectSnapshot}
            className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-slate-200"
            title={t('panel.restoreCheckpointTitle')}
          >
            <Undo2 className="w-4 h-4" /> {t('panel.restoreCheckpoint')}
          </button>
        </div>

        <button
          onClick={onProvideHint}
          className="py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-amber-200"
        >
          <Lightbulb className="w-4 h-4" /> {t('panel.giveHint')}
        </button>
      </div>

      <div className="flex gap-1.5 mt-1.5 p-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => setInteractionMode('toggle')}
          className={`flex-1 py-1.5 text-xs rounded-md font-bold flex items-center justify-center gap-1.5 transition-all ${
            interactionMode === 'toggle'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <MousePointerClick className="w-3.5 h-3.5" /> {t('panel.rotate')}
        </button>
        <button
          onClick={() => setInteractionMode('paint')}
          className={`flex-1 py-1.5 text-xs rounded-md font-bold flex items-center justify-center gap-1.5 transition-all ${
            interactionMode === 'paint'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <PaintRoller className="w-3.5 h-3.5" /> {t('panel.place')}
        </button>
      </div>

      {interactionMode === 'paint' && (
        <div className="flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-200">
          <button
            onClick={() => setCurrentBrush(1)}
            className={`flex-1 py-2 rounded flex justify-center ${
              currentBrush === 1 ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Square fill="currentColor" className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentBrush(2)}
            className={`flex-1 py-2 rounded flex justify-center ${
              currentBrush === 2 ? 'bg-red-50 text-red-500 shadow-sm border border-red-200' : 'text-slate-400 hover:bg-slate-200'
            }`}
          >
            <XSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentBrush(0)}
            className={`flex-1 py-2 rounded flex justify-center ${
              currentBrush === 0 ? 'bg-white text-slate-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Eraser className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 辅助设置 */}
      <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400">{t('panel.assistSettings')}</span>
        <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={gameSettings.showTimer}
            onChange={(e) => setGameSettings((p) => ({ ...p, showTimer: e.target.checked }))}
            className="accent-indigo-600 w-3 h-3"
          />{' '}
          {t('panel.showTimer')}
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={gameSettings.completeLineStyle === 'highlight'}
            onChange={(e) =>
              setGameSettings((p) => ({
                ...p,
                completeLineStyle: e.target.checked ? 'highlight' : 'fade',
              }))
            }
            className="accent-indigo-600 w-3 h-3"
          />{' '}
          {t('panel.completeLineHighlight')}
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={gameSettings.autoMarkNumbers}
            onChange={(e) => setGameSettings((p) => ({ ...p, autoMarkNumbers: e.target.checked }))}
            className="accent-indigo-600 w-3 h-3"
          />{' '}
          {t('panel.autoMarkNumbers')}
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={gameSettings.autoFillCross}
            onChange={(e) => setGameSettings((p) => ({ ...p, autoFillCross: e.target.checked }))}
            className="accent-indigo-600 w-3 h-3"
          />{' '}
          {t('panel.autoFillCross')}
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={gameSettings.showClueSums}
            onChange={(e) => setGameSettings((p) => ({ ...p, showClueSums: e.target.checked }))}
            className="accent-indigo-600 w-3 h-3"
          />{' '}
          {t('panel.clueSum')}
        </label>
        <label
          className="flex items-center gap-2 text-xs cursor-pointer text-slate-700"
          title={t('panel.dualSideCluesHint')}
        >
          <input
            type="checkbox"
            checked={gameSettings.showDualSideClues}
            onChange={(e) => setGameSettings((p) => ({ ...p, showDualSideClues: e.target.checked }))}
            className="accent-indigo-600 w-3 h-3"
          />{' '}
          {t('panel.dualSideClues')}
        </label>
        <div className="border-t border-slate-100 pt-2 mt-1 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400">{t('panel.hoverHints')}</span>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={gameSettings.hoverRowClues}
                onChange={(e) => setGameSettings((p) => ({ ...p, hoverRowClues: e.target.checked }))}
                className="accent-indigo-600 w-3 h-3"
              />
              {t('panel.hoverRow')}
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={gameSettings.hoverColClues}
                onChange={(e) => setGameSettings((p) => ({ ...p, hoverColClues: e.target.checked }))}
                className="accent-indigo-600 w-3 h-3"
              />
              {t('panel.hoverCol')}
            </label>
          </div>
        </div>
      </div>
    </Accordion>
  );
};

export default SidePanelGameControls;
