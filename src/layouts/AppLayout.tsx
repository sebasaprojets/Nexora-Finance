import { Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { BottomNav } from '@/components/layout/BottomNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { TourOverlay } from '@/components/tour/Tour';
import { BiometricPrompt } from '@/components/common/BiometricPrompt';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useOnline } from '@/hooks/useOnline';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useUI } from '@/store/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { runAlertRules } from '@/services/notifications';

/**
 * Mantém o conteúdo da rota em que o elemento foi montado. Sem isso, durante a
 * transição a página que sai renderizaria a rota
 * nova — montando-a duas vezes e perdendo estado (ex.: modal aberto via ?nova=1).
 */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

/** Baixa em segundo plano as telas mais usadas, para a navegação ser instantânea. */
function usePrefetchRoutes() {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return; // respeita o "economia de dados" do usuário
    const load = () => {
      void import('@/pages/app/Transactions');
      void import('@/pages/app/Analytics');
      void import('@/pages/app/Accounts');
      void import('@/pages/app/Cards');
      void import('@/pages/app/Assistant');
      void import('@/pages/app/Goals');
      void import('@/pages/app/Budgets');
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(load, { timeout: 4000 }) : window.setTimeout(load, 2500);
    return () => {
      if (!w.requestIdleCallback) clearTimeout(id);
    };
  }, []);
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const reduced = useReducedMotion();
  const openTx = useUI((s) => s.openTransaction);
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  usePrefetchRoutes();
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
        <DemoBanner />
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-xs font-medium text-warning">
            <WifiOff className="size-3.5" aria-hidden /> Você está offline — exibindo dados salvos neste dispositivo.
          </div>
        )}
        <main id="conteudo" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
          {/* Entrada suave da nova página, sem esperar a anterior sair (navegação instantânea). */}
          <motion.div
              key={location.pathname}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Suspense fallback={<PageSkeleton />}>
                <FrozenOutlet />
              </Suspense>
            </motion.div>
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <TransactionModal />
      <InstallPrompt />
      <TourOverlay />
      <BiometricPrompt />
    </div>
  );
}
