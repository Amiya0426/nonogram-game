import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { LANGS, useI18n } from '../i18n/index.js';

const LanguageSwitcher = ({ compact = false }) => {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('panel.language')}
        className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors outline-none ${
          compact
            ? 'px-2 py-2 hover:bg-indigo-50 hover:text-indigo-600'
            : 'px-2.5 py-1.5 text-xs font-bold hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
      >
        <Globe className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {!compact && <span>{current.label}</span>}
        <ChevronDown
          className={`${compact ? 'hidden' : 'w-3 h-3'} transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[9rem] bg-white rounded-xl border border-slate-200 shadow-xl py-1"
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={lang === l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between gap-2 transition-colors ${
                lang === l.code
                  ? 'text-indigo-600 bg-indigo-50/70'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{l.label}</span>
              {lang === l.code && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
