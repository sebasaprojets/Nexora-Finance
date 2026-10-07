import { Suspense, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useOnline } from '@/hooks/useOnline';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useUI } from '@/store/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { runAlertRules } from '@/services/notifications';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const reduced = useReducedMotion();
  const openTx = useUI((s) => s.openTransaction);
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const data = useFinanceData();
  const debounced = useDebounce(data, 800);

  // Avalia regras de alerta (faturas, orçamentos, metas…) quando os dados mudam.
  useEffect(() => {
    runAlertRules(debounced);
  }, [debounced]);

  const shortcuts = useMemo(
    () => ({
      'mod+k': () => setCommandOpen(!useUI.getState().commandOpen),
      n: () => openTx({ type: 'expense' }),
      d: () => openTx({ type: 'expense' }),
      r: () => openTx({ type: 'income' }),
      g: () => navigate('/app'),
      t: () => navigate('/app/transacoes'),
    }),
    [navigate, openTx, setCommandOpen],
  );
  useShortcuts(shortcuts);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh">
      <a href="#conteudo" className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-xs font-medium text-warning">
            <WifiOff className="size-3.5" aria-hidden /> Você está offline — exibindo dados salvos neste dispositivo.
          </div>
        )}
        <main id="conteudo" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <TransactionModal />
      <InstallPrompt />
    </div>
  );
}
