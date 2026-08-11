import { Eraser, X, Check } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

/** 侧边栏底部操作区：清空棋盘、完成/取消编辑或一键解题、快捷按钮 */
const SidePanelFooter = ({
  mode,
  onClearBoard,
  onCancelEditing,
  onFinishEditing,
  onAutoSolve,
  footerActions,
}) => {
  const { t } = useI18n();

  return (
    <div className="mt-auto pt-2 flex flex-col gap-2 shrink-0">
      <button
        onClick={onClearBoard}
        className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
      >
        <Eraser className="w-4 h-4" />{' '}
        {mode === 'edit' ? t('panel.clearBoardPattern') : t('panel.clearBoard')}
      </button>
      {mode === 'edit' ? (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onCancelEditing}
            className="py-2.5 bg-white hover:bg-slate-100 text-slate-600 font-bold rounded-lg border border-slate-200 flex items-center justify-center gap-2 transition-colors text-sm"
            title={t('panel.cancelEditTitle')}
          >
            <X className="w-4 h-4" /> {t('panel.cancelEdit')}
          </button>
          <button
            onClick={onFinishEditing}
            className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Check className="w-4 h-4" /> {t('panel.finishPlay')}
          </button>
        </div>
      ) : (
        <button
          data-testid="autosolve-btn"
          onClick={onAutoSolve}
          className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <Check className="w-4 h-4" /> {t('panel.autoSolve')}
        </button>
      )}
      <div className="flex items-center gap-1 pt-1.5 mt-1 border-t border-slate-100">
        {footerActions.map(({ key, Icon, title, onClick }) => (
          <button
            key={key}
            onClick={onClick}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title={title}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SidePanelFooter;
