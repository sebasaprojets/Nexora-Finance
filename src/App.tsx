import { lazy, Suspense, useEffect, useState, type ReactNode, Fragment } from 'react';
import { useLang } from '@/i18n/lang';
import { t } from '@/i18n';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from '@/components/ui/Toaster';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useApplyTheme } from '@/hooks/useTheme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { IntroSplash, REPLAY_INTRO_EVENT } from '@/components/brand/IntroSplash';

// Code splitting por rota (o shell do app só é baixado depois do login).
const AppLayout = lazy(() => import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })));
const Landing = lazy(() => import('@/pages/public/Landing'));
const Legal = lazy(() => import('@/pages/public/Legal'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const More = lazy(() => import('@/pages/app/More'));
const Help = lazy(() => import('@/pages/app/Help'));
const Plan = lazy(() => import('@/pages/app/Plan'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const Onboarding = lazy(() => import('@/pages/auth/Onboarding'));
const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const Transactions = lazy(() => import('@/pages/app/Transactions'));
const Accounts = lazy(() => import('@/pages/app/Accounts'));
const Categories = lazy(() => import('@/pages/app/Categories'));
const Cards = lazy(() => import('@/pages/app/Cards'));
const Budgets = lazy(() => import('@/pages/app/Budgets'));
const Goals = lazy(() => import('@/pages/app/Goals'));
const Debts = lazy(() => import('@/pages/app/Debts'));
const Investments = lazy(() => import('@/pages/app/Investments'));
const Subscriptions = lazy(() => import('@/pages/app/Subscriptions'));
const Analytics = lazy(() => import('@/pages/app/Analytics'));
const Reports = lazy(() => import('@/pages/app/Reports'));
const CalendarPage = lazy(() => import('@/pages/app/Calendar'));
const Notifications = lazy(() => import('@/pages/app/Notifications'));
const Assistant = lazy(() => import('@/pages/app/Assistant'));
const Health = lazy(() => import('@/pages/app/Health'));
const Profile = lazy(() => import('@/pages/app/Profile'));
const SettingsPage = lazy(() => import('@/pages/app/Settings'));
const Security = lazy(() => import('@/pages/app/Security'));
const PrivacyData = lazy(() => import('@/pages/app/PrivacyData'));
const NotFound = lazy(() => import('@/pages/public/NotFound'));

/** Carrega o workspace do usuário autenticado. */
function useWorkspaceSync() {
  const user = useAuth((s) => s.user);
  const userId = useFinance((s) => s.userId);
  const hydrate = useFinance((s) => s.hydrate);
  const reset = useFinance((s) => s.reset);
  useEffect(() => {
    if (user && user.id !== userId) hydrate(user.id, { demo: user.provider === 'demo', email: user.email });
    if (!user && userId) reset();
  }, [user, userId, hydrate, reset]);
}

function RequireAuth({ children, allowOnboarding }: { children: ReactNode; allowOnboarding?: boolean }) {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const ready = useFinance((s) => s.ready && s.userId === user?.id);
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'anonymous') return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (!ready) return <FullScreenLoader />;
  if (user && !user.onboarded && !allowOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'authenticated') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label={t('Carregando')}>
      <div className="size-8 animate-spin rounded-full border-2 border-border-strong border-t-primary" />
    </div>
  );
}

export function App() {
  const init = useAuth((s) => s.init);
  const reduced = useReducedMotion();
  // Trocar o idioma remonta a interface para todos os textos (t()) serem refeitos.
  const lang = useLang((s) => s.lang);
  useApplyTheme();
  useWorkspaceSync();
  useEffect(() => init(), [init]);
  // Abertura cinematográfica: sempre exibida ao abrir/recarregar o site, em qualquer dispositivo.
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const replay = () => setIntro(true);
    window.addEventListener(REPLAY_INTRO_EVENT, replay);
    return () => window.removeEventListener(REPLAY_INTRO_EVENT, replay);
  }, []);

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <ErrorBoundary>
        <Fragment key={lang}>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/privacidade" element={<Legal doc="privacy" />} />
              <Route path="/termos" element={<Legal doc="terms" />} />
              <Route path="/entrar" element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="/cadastro" element={<GuestOnly><Register /></GuestOnly>} />
              <Route path="/recuperar-senha" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route path="/onboarding" element={<RequireAuth allowOnboarding><Onboarding /></RequireAuth>} />
              <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="transacoes" element={<Transactions />} />
                <Route path="contas" element={<Accounts />} />
                <Route path="categorias" element={<Categories />} />
                <Route path="cartoes" element={<Cards />} />
                <Route path="orcamentos" element={<Budgets />} />
                <Route path="metas" element={<Goals />} />
                <Route path="dividas" element={<Debts />} />
                <Route path="investimentos" element={<Investments />} />
                <Route path="assinaturas" element={<Subscriptions />} />
                <Route path="analises" element={<Analytics />} />
                <Route path="relatorios" element={<Reports />} />
                <Route path="calendario" element={<CalendarPage />} />
                <Route path="notificacoes" element={<Notifications />} />
                <Route path="assistente" element={<Assistant />} />
                <Route path="saude" element={<Health />} />
                <Route path="perfil" element={<Profile />} />
                <Route path="plano" element={<Plan />} />
                <Route path="ajuda" element={<Help />} />
                <Route path="mais" element={<More />} />
                <Route path="configuracoes" element={<SettingsPage />} />
                <Route path="seguranca" element={<Security />} />
                <Route path="privacidade" element={<PrivacyData />} />
                <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound inApp /></Suspense>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
        </Fragment>
        {intro && <IntroSplash onDone={() => setIntro(false)} />}
      </ErrorBoundary>
    </MotionConfig>
  );
}
