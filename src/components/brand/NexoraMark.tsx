import { useId } from 'react';
import { MARK, MARK_VIEWBOX } from './geometry';

/** Gradientes da marca (ids únicos por instância). */
export function MarkDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#22F2D6" />
        <stop offset="45%" stopColor="#1FA8F0" />
        <stop offset="100%" stopColor="#3B3FF0" />
      </linearGradient>
      <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#25F0D9" />
        <stop offset="60%" stopColor="#1FC9E4" />
        <stop offset="100%" stopColor="#2CE6D2" />
      </linearGradient>
      <linearGradient id={`${id}-right`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#24EEDA" />
        <stop offset="55%" stopColor="#2B8BF2" />
        <stop offset="100%" stopColor="#3A44F0" />
      </linearGradient>
      <linearGradient id={`${id}-mid`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1DD6E0" />
        <stop offset="100%" stopColor="#1B4FB8" />
      </linearGradient>
      <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#1638A8" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#1638A8" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

export const markFill = (id: string) => ({
  midBar: `url(#${id}-mid)`,
  ribbon: `url(#${id}-ribbon)`,
  rightFace: `url(#${id}-right)`,
  leftStem: `url(#${id}-stem)`,
  fold: `url(#${id}-fold)`,
});

/** Símbolo "N" da Nexora (estático). */
export function NexoraMark({ className, title }: { className?: string; title?: string }) {
  const id = `nx${useId().replace(/:/g, '')}`;
  const f = markFill(id);
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <MarkDefs id={id} />
      <path d={MARK.midBar} fill={f.midBar} />
      <path d={MARK.ribbon} fill={f.ribbon} />
      <path d={MARK.rightFace} fill={f.rightFace} />
      <path d={MARK.leftStem} fill={f.leftStem} />
      <path d={MARK.fold} fill={f.fold} />
    </svg>
  );
}
