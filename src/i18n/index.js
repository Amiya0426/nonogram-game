import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';
import zh from './zh.js';

// 新增语言：在 LANGS 中追加一项，并新增对应语言包文件、注册到 messages
export const LANGS = [
  { code: 'zh', label: '简体中文', short: '中' },
  { code: 'zh-Hant', label: '繁體中文', short: '繁' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ja', label: '日本語', short: '日' },
];

// 默认语言随主包加载；其余语言包按需动态加载，减小首屏 JS 体积
const messages = { zh };
const loaders = {
  'zh-Hant': () => import('./zh-Hant.js'),
  en: () => import('./en.js'),
  ja: () => import('./ja.js'),
};
const HTML_LANG = { zh: 'zh-CN', 'zh-Hant': 'zh-TW', en: 'en', ja: 'ja' };
const TITLE = 'Nonogram';
const STORE_KEY = 'nonogram_lang';
let currentLang = 'zh';

const loadMessages = async (code) => {
  const loader = loaders[code];
  if (loader && !messages[code]) {
    const mod = await loader();
    messages[code] = mod.default;
  }
  return messages[code];
};

const detectLang = () => {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && LANGS.some((l) => l.code === saved)) return saved;
    const nav = (navigator.language || 'zh').toLowerCase();
    if (nav.startsWith('zh')) {
      return /(^|-)tw(-|$)|hk|mo|hant/.test(nav) ? 'zh-Hant' : 'zh';
    }
    if (nav.startsWith('ja')) return 'ja';
    return 'en';
  } catch {
    return 'zh';
  }
};

const resolve = (key, dict) =>
  key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), dict);

const interpolate = (text, vars) => {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] !== undefined ? vars[k] : m,
  );
};

/** 非 React 模块使用的翻译（语言切换后由 Provider 同步 currentLang） */
export const translate = (key, vars) =>
  interpolate(resolve(key, messages[currentLang]) ?? resolve(key, messages.zh) ?? key, vars);

export const getLang = () => currentLang;

const I18nContext = createContext({ lang: 'zh', t: translate, setLang: () => {} });

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(detectLang);
  const [, setDictTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    currentLang = lang;
    try {
      localStorage.setItem(STORE_KEY, lang);
    } catch {
      // 忽略存储失败
    }
    document.documentElement.lang = HTML_LANG[lang] || 'zh-CN';
    document.title = TITLE;
    // 语言包加载完成后触发一次重渲染，切回该语言的实际文案
    loadMessages(lang).then(() => {
      if (!cancelled) setDictTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const setLang = useCallback((code) => {
    if (LANGS.some((l) => l.code === code)) setLangState(code);
  }, []);

  const t = useCallback(
    (key, vars) => interpolate(resolve(key, messages[lang]) ?? resolve(key, messages.zh) ?? key, vars),
    [lang],
  );

  return createElement(I18nContext.Provider, { value: { lang, t, setLang } }, children);
};

export const useI18n = () => useContext(I18nContext);
