/**
 * Lightweight i18n system for Narrative Engine.
 *
 * Why not react-i18next? It's 60KB+ and we don't need its features
 * (interpolation, pluralization, namespaces). A 100-line wrapper around
 * a dictionary is enough and keeps the bundle small.
 *
 * Usage:
 *   import { t, useLanguage } from './i18n';
 *   const { lang, setLang } = useLanguage();
 *   <button>{t('settings.title')}</button>
 *
 * Keys are flat strings (e.g. 'settings.title'). If a key is missing in
 * the active language, it falls back to English. If it's missing in
 * English too, the key itself is returned (so untranslated strings show
 * as English during development instead of crashing).
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en } from './locales/en';
import { fa } from './locales/fa';

export type Lang = 'en' | 'fa';

export const LANGUAGES: { code: Lang; label: string; labelNative: string }[] = [
  { code: 'en', label: 'English', labelNative: 'English' },
  { code: 'fa', label: 'Persian', labelNative: 'فارسی' },
];

type Dictionary = Record<string, string>;

const DICTS: Record<Lang, Dictionary> = {
  en,
  fa,
};

const STORAGE_KEY = 'narrative_lang';

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** True when the active language is RTL (Persian, Arabic, Hebrew, …). */
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  isRTL: false,
});

function detectInitialLang(): Lang {
  // 1. Explicit user choice wins.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fa') return saved;
  } catch {
    // SSR or restricted storage — ignore.
  }
  // 2. Fall back to browser/device language.
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('fa') || nav.startsWith('persian')) return 'fa';
  return 'en';
}

const RTL_LANGS: Lang[] = ['fa'];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  };

  // Sync <html lang> + dir so the browser handles RTL layout, fonts, and
  // scrollbar placement for us. Tailwind's rtl: variants also key off dir.
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    _syncCurrentLang(lang);
  }, [lang]);

  const value: I18nContextValue = {
    lang,
    setLang,
    isRTL: RTL_LANGS.includes(lang),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLanguage(): I18nContextValue {
  return useContext(I18nContext);
}

/**
 * Translate a key. Falls back to English, then to the key itself.
 *
 * This is intentionally a plain function (not a hook) so it can be used
 * outside React components — in services, store slices, etc. It reads
 * the current language from a module-level variable kept in sync by
 * the provider, so it always reflects the latest user choice.
 */
let currentLang: Lang = 'en';

export function _syncCurrentLang(lang: Lang) {
  currentLang = lang;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[currentLang] ?? DICTS.en;
  let str = dict[key] ?? DICTS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}
