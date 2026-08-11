import { LogIn, LogOut, Trophy, UserRound, Library } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

/** 用户区：登录/注册入口或用户卡片 + 题库浏览 */
const SidePanelUserArea = ({ user, userProgress, onLogout, onOpenAuth, onOpenBrowse }) => {
  const { t } = useI18n();

  if (!user) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-3 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
          <UserRound className="w-3.5 h-3.5" /> {t('panel.loginHint')}
        </div>
        <button
          data-testid="auth-open-btn"
          onClick={onOpenAuth}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1.5 shadow-sm"
        >
          <LogIn className="w-3.5 h-3.5" /> {t('panel.login')} / {t('panel.register')}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-3 flex flex-col gap-2 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
          {String(user.username || '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-800 truncate">{user.username}</div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
            <Trophy className="w-3 h-3 text-amber-500" />
            {t('panel.solvedCount', { n: userProgress.length })}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          title={t('panel.logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      <button
        data-testid="browse-btn"
        onClick={onOpenBrowse}
        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-indigo-200"
      >
        <Library className="w-4 h-4" /> {t('panel.browse')}
      </button>
    </div>
  );
};

export default SidePanelUserArea;
