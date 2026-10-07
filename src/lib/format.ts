import type { CurrencyCode } from '@/types';
import { currentLang, currentLocale, t } from '@/i18n';

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/** `label` é traduzido no idioma atual a cada leitura. */
export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'BRL', get label() { return t('Real brasileiro'); }, symbol: 'R$' },
  { code: 'USD', get label() { return t('Dólar americano'); }, symbol: 'US$' },
  { code: 'EUR', get label() { return t('Euro'); }, symbol: '€' },
  { code: 'GBP', get label() { return t('Libra esterlina'); }, symbol: '£' },
];

const cache = new Map<string, Intl.NumberFormat>();
function nf(key: string, make: () => Intl.NumberFormat) {
  let f = cache.get(key);
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

export interface MoneyOptions {
  currency?: CurrencyCode;
  /** Exibe sinal + para positivos. */
  signed?: boolean;
  /** Sem casas decimais. */
  compact?: boolean;
  /** Abrevia (12,5 mil). */
  abbreviate?: boolean;
}

/** `R$ 1.250,50` — padrão BRL. */
export function formatMoney(value: number, opts: MoneyOptions = {}): string {
  const currency = opts.currency ?? 'BRL';
  const locale = LOCALE_BY_CURRENCY[currency];
  const v = Object.is(value, -0) ? 0 : value;
  let out: string;
  if (opts.abbreviate && Math.abs(v) >= 10_000) {
    // Abreviação ("mil", "K", "mi") segue o idioma do app.
    const abbrLocale = currentLocale();
    out = nf(`${currency}-abbr-${abbrLocale}`, () =>
      new Intl.NumberFormat(abbrLocale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }),
    ).format(v);
  } else {
    const digits = opts.compact ? 0 : 2;
    out = nf(`${currency}-${digits}`, () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
    ).format(v);
  }
  out = out.replace(/ /g, ' ');
  if (opts.signed && v > 0) out = `+${out}`;
  return out;
}

/** `37,9%` */
export function formatPercent(value: number, digits = 1, signed = false): string {
  if (!Number.isFinite(value)) return '—';
  const locale = currentLocale();
  const s = nf(`pct-${locale}-${digits}`, () =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  ).format(value);
  return `${signed && value > 0 ? '+' : ''}${s}%`;
}

export function formatNumber(value: number, digits = 0): string {
  const locale = currentLocale();
  return nf(`num-${locale}-${digits}`, () =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  ).format(value);
}

/** Variação percentual entre dois valores; `null` quando a base é zero. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Converte texto digitado ("1.250,50", "35,9", "R$ 10") em número.
 * Aceita vírgula ou ponto como separador decimal.
 */
export function parseMoneyInput(raw: string): number {
  const s = raw.replace(/[^\d,.-]/g, '');
  if (!s) return NaN;
  let normalized: string;
  const comma = s.lastIndexOf(',');
  const dot = s.lastIndexOf('.');
  if (comma >= 0 && dot > comma) {
    // "1,250.50" — vírgula como separador de milhar.
    normalized = s.replace(/,/g, '').replace(/\.(?=[^.]*\.)/g, '');
  } else if (currentLang() === 'en' && comma >= 0 && dot < 0 && s.split(',').slice(1).every((g) => g.length === 3)) {
    // Em inglês, "1,250" é mil duzentos e cinquenta.
    normalized = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    normalized = s.replace(/\./g, '').replace(/,(?=[^,]*,)/g, '').replace(',', '.');
  } else if (s.includes('.')) {
    const groups = s.split('.').slice(1);
    normalized = groups.every((g) => g.length === 3)
      ? s.replace(/\./g, '')
      : s.replace(/\.(?=[^.]*\.)/g, '');
  } else normalized = s;
  return round2(Number(normalized));
}

export const MASK = '••••••';

/** Rótulo curto para eixos de gráficos, sem símbolo da moeda: "10,5 mil" · "10.5K". */
export function formatAxis(value: number): string {
  const loc = currentLocale();
  return nf(`axis-${loc}`, () => new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1 })).format(value);
}
