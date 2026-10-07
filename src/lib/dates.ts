import type { ISODate } from '@/types';

/** Utilitários de data trabalhando em horário local com strings `YYYY-MM-DD`. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Soma meses mantendo o dia, limitado ao último dia do mês resultante. */
export function addMonths(s: ISODate, months: number): ISODate {
  const d = parseISODate(s);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return toISODate(target);
}

export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}

export function startOfMonth(s: ISODate): ISODate {
  return `${s.slice(0, 7)}-01`;
}

export function endOfMonth(s: ISODate): ISODate {
  const d = parseISODate(startOfMonth(s));
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

/** Data com dia limitado ao tamanho do mês (ex.: dia 31 em fevereiro → 28/29). */
export function dateInMonth(year: number, month1: number, day: number): ISODate {
  return `${year}-${pad(month1)}-${pad(Math.min(day, daysInMonth(year, month1)))}`;
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function eachMonth(from: ISODate, to: ISODate): string[] {
  const out: string[] = [];
  for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) out.push(monthKey(d));
  return out;
}

/** Segunda-feira da semana da data. */
export function startOfWeek(s: ISODate): ISODate {
  const d = parseISODate(s);
  const dow = (d.getDay() + 6) % 7;
  return addDays(s, -dow);
}

export function isBetween(s: ISODate, from: ISODate, to: ISODate): boolean {
  return s >= from && s <= to;
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
export const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** `DD/MM/YYYY` */
export function formatDate(s: ISODate): string {
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** `DD/MM` */
export function formatDayMonth(s: ISODate): string {
  const [, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}`;
}

/** `out/26` */
export function formatMonthShort(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
}

/** `Outubro de 2026` */
export function formatMonthLong(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} de ${y}`;
}

export function monthName(key: string): string {
  return MONTHS_LONG[Number(key.split('-')[1]) - 1];
}

/** "Hoje", "Ontem" ou `DD/MM/YYYY`. */
export function formatRelativeDay(s: ISODate, ref: ISODate = today()): string {
  const diff = diffDays(s, ref);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff === -1) return 'Amanhã';
  return formatDate(s);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(toISODate(d))} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  return formatDate(toISODate(new Date(iso)));
}
