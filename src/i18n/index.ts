import { useLang, LANGS, type Lang } from './lang';

/**
 * Tradução do app. A CHAVE é o próprio texto em português:
 *
 *   t('Nova conta')                       → "New account" / "Nueva cuenta"
 *   t('Olá, {name}!', { name: 'Ana' })    → "Hi, Ana!"
 *
 * As traduções ficam em `src/i18n/locales/*.ts` (um arquivo por área do app),
 * cada um exportando `{ en: {...}, es: {...} }`. Sem tradução, mostra o português.
 *
 * Regras:
 * - Nunca chame `t()` no topo do módulo (fora de função): o idioma pode mudar.
 * - Para textos com valores, use `{nome}` e passe `vars` — não use template string dentro de `t()`.
 * - Ao trocar o idioma, o app é remontado (ver App.tsx), então `t()` funciona em qualquer lugar.
 */
export type Dict = Record<string, string>;
export interface LocaleModule {
  en: Dict;
  es: Dict;
}

const modules = import.meta.glob<{ default: LocaleModule }>('./locales/*.ts', { eager: true });
const DICTS: Record<Exclude<Lang, 'pt'>, Dict> = { en: {}, es: {} };
for (const m of Object.values(modules)) {
  Object.assign(DICTS.en, m.default.en);
  Object.assign(DICTS.es, m.default.es);
}

export function currentLang(): Lang {
  return useLang.getState().lang;
}

/** Locale do Intl para o idioma atual (datas, números e ordenação). */
export function currentLocale(): string {
  return LANGS.find((l) => l.code === currentLang())!.html.replace(/^en$/, 'en-US').replace(/^es$/, 'es-ES');
}

const VAR = /\{(\w+)\}/g;

/**
 * Chaves com contexto: `'Ações||investimento'` diferencia palavras iguais com sentidos
 * diferentes (ações da bolsa × menu de ações). Em português, o `||contexto` é removido.
 */
const CONTEXT = /\|\|.*$/s;

export function t(key: string, vars?: Record<string, string | number | null | undefined>): string {
  if (key == null) return key;
  const lang = currentLang();
  const text = (lang === 'pt' ? key : (DICTS[lang][key] ?? key)).replace(CONTEXT, '');
  return vars ? text.replace(VAR, (m, k: string) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k]))) : text;
}

/** Hook: devolve `t` e re-renderiza quando o idioma muda. */
export function useT() {
  useLang((s) => s.lang);
  return t;
}

/** Só para testes/diagnóstico. */
export const __dicts = DICTS;
export { useLang, LANGS, type Lang };
