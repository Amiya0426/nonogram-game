import { Dices, PencilLine, Pin, PinOff } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useI18n } from '../i18n/index.js';

/** 侧边栏头部：游玩模式标题栏 / 编辑模式橙色横幅 */
const SidePanelHeader = ({ mode, isPanelPinned, setIsPanelPinned, setIsPanelHovered }) => {
  const { t } = useI18n();

  if (mode === 'play') {
    return (
      <div className="hidden md:flex pb-2 border-b border-slate-100 justify-between items-center">
        <div>
          <h1
            data-testid="panel-title"
            className="text-2xl font-bold flex items-center gap-2 text-indigo-900"
          >
            <Dices className="w-7 h-7 text-indigo-500" /> {t('app.title')}
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">{t('app.playMode')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <button
            onClick={() => {
              setIsPanelPinned(!isPanelPinned);
              // 取消固定后保持悬停展开一次，避免按钮消失
              setIsPanelHovered(true);
            }}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              !isPanelPinned
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
            }`}
            title={isPanelPinned ? t('panel.unpinPanel') : t('panel.pinPanel')}
          >
            {isPanelPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 rounded-xl border border-orange-200 p-3 flex flex-col gap-2.5 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600 shrink-0">
            <PencilLine className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-orange-900">{t('panel.customTitle')}</div>
            <div className="text-[9px] text-orange-600/70 truncate">
              {t('panel.customSubtitle')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidePanelHeader;
