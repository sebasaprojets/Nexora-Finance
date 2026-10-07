import { useSettings } from '@/store/settings';
import { useMediaQuery } from './useMediaQuery';

export function useReducedMotion() {
  const pref = useSettings((s) => s.reducedMotion);
  const system = useMediaQuery('(prefers-reduced-motion: reduce)');
  return pref === 'on' ? true : pref === 'off' ? false : system;
}
