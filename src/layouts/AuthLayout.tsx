import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

/** Layout das telas de autenticação: formulário + painel de marca. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" aria-label="Nexora — página inicial" className="w-fit">
          <Logo />
        </Link>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-fg-subtle">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-fg-subtle">{footer}</div>}
        </motion.div>
        <p className="text-center text-xs text-fg-subtle">
          © {new Date().getFullYear()} Nexora Finance · <Link to="/privacidade" className="hover:text-fg">Privacidade</Link> · <Link to="/termos" className="hover:text-fg">Termos</Link>
        </p>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-border bg-bg-elevated lg:block" aria-hidden>
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -top-40 -right-20 size-[520px] rounded-full bg-[#7b6dff]/20 blur-[120px]" />
        <div className="absolute -bottom-40 left-0 size-[420px] rounded-full bg-[#22d3ee]/10 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="glass max-w-md rounded-3xl p-6 shadow-lg">
            <p className="text-xs text-fg-subtle">Patrimônio líquido</p>
            <p className="tabular mt-1 font-display text-4xl font-semibold tracking-tight">R$ 30.780,00</p>
            <svg viewBox="0 0 300 80" className="mt-4 h-20 w-full">
              <defs>
                <linearGradient id="auth-g" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7b6dff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#7b6dff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,62 C30,58 45,64 70,50 C95,36 115,44 140,34 C165,24 190,32 215,20 C240,8 265,14 300,6 L300,80 L0,80Z" fill="url(#auth-g)" />
              <path d="M0,62 C30,58 45,64 70,50 C95,36 115,44 140,34 C165,24 190,32 215,20 C240,8 265,14 300,6" fill="none" stroke="#8f83ff" strokeWidth="2" />
            </svg>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              {[
                ['Entradas', 'R$ 8.500'],
                ['Saídas', 'R$ 5.240'],
                ['Economia', 'R$ 3.260'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-border bg-surface/60 p-2.5">
                  <p className="text-fg-subtle">{l}</p>
                  <p className="tabular mt-0.5 font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <h2 className="mt-10 max-w-md font-display text-3xl font-semibold tracking-tight">Inteligência financeira em um só lugar.</h2>
          <ul className="mt-6 space-y-3 text-sm text-fg-muted">
            <li className="flex items-center gap-2.5"><ShieldCheck className="size-4 text-primary" /> Dados protegidos e controle total sobre eles (LGPD)</li>
            <li className="flex items-center gap-2.5"><Sparkles className="size-4 text-primary" /> Insights automáticos baseados nos seus números</li>
            <li className="flex items-center gap-2.5"><Lock className="size-4 text-primary" /> Sessões seguras e gerenciamento de dispositivos</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
