/**
 * Geometria vetorial da marca Nexora (símbolo "N" em fita + wordmark).
 * Compartilhada entre o logo estático e a abertura animada.
 */

/** Símbolo: viewBox 0 0 416 342. Ordem de desenho: de trás para frente. */
export const MARK_VIEWBOX = '0 0 416 342';

export const MARK = {
  /** Barra do meio (gráfico), atrás da fita. */
  midBar: 'M276 98 L330 64 L330 246 L276 210 Z',
  /** Fita diagonal + haste direita (uma peça). */
  ribbon: 'M357 38 L412 4 L412 262 C412 306 382 338 342 338 L30 104 C42 66 62 38 88 35 L357 222 Z',
  /** Haste esquerda (frente), com o topo arredondado da dobra. */
  leftStem: 'M2 338 L2 118 C2 70 36 36 84 35 L104 49 L104 282 Z',
  /** Sombra da dobra (parte de baixo da fita aparecendo). */
  fold: 'M104 49 L104 214 L58 170 C48 150 44 128 48 108 C54 82 74 60 104 49 Z',
  /** Face clara da haste direita. */
  rightFace: 'M357 38 L412 4 L412 262 C412 288 402 310 386 322 L357 300 Z',
};

/** Wordmark "NEXORA": viewBox 0 0 880 106, desenhado com traços (stroke). */
export const WORDMARK_VIEWBOX = '-12 -12 904 130';
export const WORDMARK_STROKE = 21;
export const WORDMARK = [
  { id: 'N', d: 'M11 106 V10 L119 96 V0' },
  { id: 'E', d: 'M258 10.5 H158 V95.5 H258 M158 53 H246' },
  { id: 'X1', d: 'M290 0 L404 106' },
  { id: 'X2', d: 'M404 0 L290 106', accent: true },
  { id: 'O', d: 'M500 10.5 C540 10.5 560 30 560 53 C560 76 540 95.5 500 95.5 C460 95.5 440 76 440 53 C440 30 460 10.5 500 10.5 Z' },
  { id: 'R', d: 'M613 106 V10.5 H680 C700 10.5 712 22 712 41 C712 60 700 71.5 680 71.5 H613 M672 71.5 L716 106' },
  { id: 'A', d: 'M746 106 L810 2 L874 106' },
] as const;
