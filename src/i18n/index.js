import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';
import zh from './zh.js';
import zhHant from './zh-Hant.js';
import en from './en.js';
import ja from './ja.js';

// 新增语言：在 LANGS 中追加一项，并新增对应语言包文件、注册到 messages
export const LANGS = [
  { code: 'zh', label: '简体中文', short: '中' },
  { code: 'zh-Hant', label: '繁體中文', short: '繁' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ja', label: '日本語', short: '日' },
];

const messages = { zh, 'zh-Hant': zhHant, en, ja };
const HTML_LANG = { zh: 'zh-CN', 'zh-Hant': 'zh-TW', en: 'en', ja: 'ja' };
const TITLES = { zh: '数织', 'zh-Hant': '數織', en: 'Nonogram', ja: 'ノノグラム' };
const STORE_KEY = 'nonogram_lang';
let currentLang = 'zh';

const detectLang = () => {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && messages[saved]) return saved;
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

  useEffect(() => {
    currentLang = lang;
    try {
      localStorage.setItem(STORE_KEY, lang);
    } catch {
      // 忽略存储失败
    }
    document.documentElement.lang = HTML_LANG[lang] || 'zh-CN';
    document.title = TITLES[lang] || 'Nonogram';
  }, [lang]);

  const setLang = useCallback((code) => {
    if (messages[code]) setLangState(code);
  }, []);

  const t = useCallback(
    (key, vars) => interpolate(resolve(key, messages[lang]) ?? resolve(key, messages.zh) ?? key, vars),
    [lang],
  );

  return createElement(I18nContext.Provider, { value: { lang, t, setLang } }, children);
};

export const useI18n = () => useContext(I18nContext);
