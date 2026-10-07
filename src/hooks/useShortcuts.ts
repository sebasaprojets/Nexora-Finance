import { useEffect } from 'react';

type Handler = (e: KeyboardEvent) => void;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * Atalhos de teclado globais. Chaves: "n", "mod+k" (Ctrl/⌘ + K).
 * Teclas simples são ignoradas enquanto o usuário digita em um campo.
 */
export function useShortcuts(map: Record<string, Handler>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const combo = `${mod ? 'mod+' : ''}${key}`;
      const handler = map[combo];
      if (!handler) return;
      if (!mod && (isTyping(e.target) || e.altKey)) return;
      if (!mod && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, enabled]);
}
