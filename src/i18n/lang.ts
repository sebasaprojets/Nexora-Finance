import { create } from 'zustand';

/** Idiomas disponíveis na página inicial. */
export type Lang = 'pt' | 'en' | 'es';

export const LANGS: { code: Lang; label: string; short: string; flag: string; html: string }[] = [
  { code: 'pt', label: 'Português', short: 'PT', flag: '🇧🇷', html: 'pt-BR' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸', html: 'en' },
  { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸', html: 'es' },
];

const KEY = 'nexora:lang';

/** Escolha salva; na primeira visita, segue o idioma do aparelho. */
function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'pt' || saved === 'en' || saved === 'es') return saved;
  } catch {
    /* armazenamento bloqueado */
  }
  const nav = typeof navigator !== 'undefined' ? (navigator.languages?.[0] ?? navigator.language ?? '') : '';
  if (/^es/i.test(nav)) return 'es';
  if (/^en/i.test(nav)) return 'en';
  return 'pt';
}

function apply(lang: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = LANGS.find((l) => l.code === lang)!.html;
}

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => {
  const lang = initial();
  apply(lang);
  return {
    lang,
    setLang: (l) => {
      try {
        localStorage.setItem(KEY, l);
      } catch {
        /* ignore */
      }
      apply(l);
      set({ lang: l });
    },
  };
});
