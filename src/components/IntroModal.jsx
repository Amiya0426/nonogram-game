import { useEffect } from 'react';
import { X, Dices, Check } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

/** 新手引导 / 帮助弹窗：玩法规则、主要功能、小提示，可随时通过帮助按钮再次打开 */
const IntroModal = ({ open, onClose }) => {
  const { t } = useI18n();

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <h2 className="flex items-center gap-2 text-lg font-bold text-indigo-900">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
              <Dices className="w-4 h-4" />
            </span>
            {t('intro.howTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 shrink-0"
            title={t('browse.closeEsc')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <ul className="flex flex-col gap-2 text-[13px] text-slate-600 leading-relaxed">
            {(t('intro.how') || []).map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-indigo-400 shrink-0">•</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" /> {t('intro.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroModal;
