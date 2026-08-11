import {
  MousePointerClick,
  Braces,
  ImagePlus,
  PaintRoller,
  Square,
  XSquare,
  Eraser,
} from 'lucide-react';
import { useI18n } from '../i18n/index.js';

/** 编辑模式工具栏：输入方式、图片导入、画笔工具 */
const SidePanelEditToolbar = ({
  editInputMode,
  setEditInputMode,
  onOpenImageImport,
  interactionMode,
  setInteractionMode,
  currentBrush,
  setCurrentBrush,
}) => {
  const { t } = useI18n();

  return (
    <>
      {/* 输入方式：画盘面 / 手动输入 */}
      <div className="flex bg-white/80 p-1 rounded-lg">
        <button
          onClick={() => setEditInputMode('pattern')}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex justify-center items-center gap-1.5 transition-all ${
            editInputMode === 'pattern'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <MousePointerClick className="w-3.5 h-3.5" /> {t('panel.pattern')}
        </button>
        <button
          onClick={() => setEditInputMode('manual')}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex justify-center items-center gap-1.5 transition-all ${
            editInputMode === 'manual'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Braces className="w-3.5 h-3.5" /> {t('panel.manual')}
        </button>
      </div>

      <button
        onClick={onOpenImageImport}
        className="w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-orange-200"
      >
        <ImagePlus className="w-4 h-4" /> {t('panel.fromImage')}
      </button>

      {/* 画笔工具（画盘面模式） */}
      {editInputMode === 'pattern' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={() => setInteractionMode('toggle')}
              className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium flex items-center justify-center gap-1 transition-all ${
                interactionMode === 'toggle'
                  ? 'bg-white text-orange-700 border-orange-300 shadow-sm'
                  : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" /> {t('panel.rotate')}
            </button>
            <button
              onClick={() => setInteractionMode('paint')}
              className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium flex items-center justify-center gap-1 transition-all ${
                interactionMode === 'paint'
                  ? 'bg-white text-orange-700 border-orange-300 shadow-sm'
                  : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
              }`}
            >
              <PaintRoller className="w-3.5 h-3.5" /> {t('panel.place')}
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentBrush(1)}
              className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                currentBrush === 1
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
              }`}
            >
              <Square fill="currentColor" className="w-3.5 h-3.5" /> {t('panel.fill')}
            </button>
            <button
              onClick={() => setCurrentBrush(2)}
              className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                currentBrush === 2
                  ? 'bg-red-50 text-red-500 shadow-sm border border-red-200'
                  : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
              }`}
            >
              <XSquare className="w-3.5 h-3.5" /> {t('panel.cross')}
            </button>
            <button
              onClick={() => setCurrentBrush(0)}
              className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                currentBrush === 0
                  ? 'bg-white text-slate-700 shadow-sm border border-slate-200'
                  : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" /> {t('panel.erase')}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-orange-800/80 leading-relaxed">
        {editInputMode === 'pattern'
          ? t('panel.patternHint')
          : t('panel.manualHint')}
      </p>
    </>
  );
};

export default SidePanelEditToolbar;
