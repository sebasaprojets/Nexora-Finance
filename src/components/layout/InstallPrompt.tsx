import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/common/Logo';
import { installPrompt, isIOS, isStandalone } from '@/lib/pwa';
import { readJSON, writeJSON } from '@/services/storage';

/** Convite discreto para instalar a Nexora como app (PWA). */
export function InstallPrompt() {
  const available = useSyncExternalStore(installPrompt.subscribe, installPrompt.available, () => false);
  const [dismissed, setDismissed] = useState(() => readJSON<number>('pwa:dismissed', 0) > Date.now());
  const [visible, setVisible] = useState(false);
  const ios = isIOS() && !isStandalone();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    writeJSON('pwa:dismissed', Date.now() + 14 * 86_400_000);
    setDismissed(true);
  };

  const show = visible && !dismissed && !isStandalone() && (available || ios);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="glass fixed inset-x-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl p-3.5 shadow-lg lg:right-6 lg:bottom-6 lg:left-auto lg:mx-0"
          role="dialog"
          aria-label="Instalar aplicativo"
        >
          <LogoMark className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Instale a Nexora</p>
            <p className="text-xs text-fg-subtle">
              {ios ? (
                <>
                  Toque em <Share className="inline size-3" aria-label="Compartilhar" /> e depois em “Adicionar à Tela de Início”.
                </>
              ) : (
                'Acesso rápido, offline básico e notificações.'
              )}
            </p>
          </div>
          {!ios && (
            <Button size="sm" leftIcon={<Download className="size-3.5" />} onClick={() => installPrompt.prompt().then(dismiss)}>
              Instalar
            </Button>
          )}
          <button onClick={dismiss} className="rounded-md p-1 text-fg-subtle hover:text-fg" aria-label="Dispensar">
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
