import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';
import zh from './zh.js';
import en from './en.js';

// 新增语言：在 LANGS 中追加一项，并新增对应语言包文件、注册到 messages
export const LANGS = [
  { code: 'zh', label: '简体中文' },
  { code: 'en', label: 'English' },
];

const messages = { zh, en };
const STORE_KEY = 'nonogram_lang';
let currentLang = 'zh';

const detectLang = () => {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && messages[saved]) return saved;
    const nav = (navigator.language || 'zh').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
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
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    document.title = lang === 'zh' ? '数织' : 'Nonogram';
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
