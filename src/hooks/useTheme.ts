import { useEffect } from 'react';
import { useSettings } from '@/store/settings';
import { useMediaQuery } from './useMediaQuery';

/** Aplica o tema (dark/light/sistema) no <html> com transição suave. */
export function useApplyTheme() {
  const theme = useSettings((s) => s.theme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#07080c' : '#f5f6fa');
    const t = setTimeout(() => root.classList.remove('theme-transition'), 320);
    return () => clearTimeout(t);
  }, [resolved]);
  return resolved;
}

export function useResolvedTheme() {
  const theme = useSettings((s) => s.theme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}
