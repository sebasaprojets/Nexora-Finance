import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Bell, CreditCard, PiggyBank, Target, TrendingUp, Wallet } from 'lucide-react';
import { LogoMark } from '@/components/common/Logo';

const bars = [42, 55, 48, 62, 58, 70, 66, 78, 72, 84, 80, 92];

/** Prévia ilustrativa do dashboard para a landing (dados de exemplo). */
export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl" aria-label="Prévia ilustrativa do painel da Nexora" role="img">
      <div className="absolute -inset-x-10 -top-10 -bottom-10 rounded-[48px] bg-gradient-to-b from-[#7b6dff]/20 via-[#22d3ee]/5 to-transparent blur-3xl" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1400 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f16]/90 p-2 shadow-[0_40px_120px_-30px_rgba(123,109,255,0.45)] backdrop-blur"
      >
        <div className="flex items-center gap-1.5 px-3 py-2" aria-hidden>
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="ml-3 h-5 flex-1 rounded-md bg-white/5" />
        </div>
        <div className="grid grid-cols-12 gap-2 rounded-2xl bg-[#07080c] p-3 text-white sm:p-4" aria-hidden>
          <div className="col-span-3 hidden flex-col gap-2 rounded-xl bg-white/[0.03] p-3 md:flex">
            <div className="flex items-center gap-2"><LogoMark className="size-6" /><span className="font-display text-xs font-semibold">Nexora</span></div>
            {['Dashboard', 'Análises', 'Transações', 'Cartões', 'Metas', 'Investimentos'].map((l, i) => (
              <div key={l} className={`mt-1 rounded-lg px-2 py-1.5 text-[11px] ${i === 0 ? 'bg-white/10 text-white' : 'text-white/45'}`}>{l}</div>
            ))}
          </div>
          <div className="col-span-12 space-y-2 md:col-span-9">
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Saldo total', v: 'R$ 12.580,40', i: Wallet, d: '+8,4%' },
                { l: 'Entradas', v: 'R$ 8.500,00', i: ArrowDownLeft, d: '+4,7%' },
                { l: 'Saídas', v: 'R$ 5.240,00', i: ArrowUpRight, d: '−2,1%' },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/50"><k.i className="size-3" />{k.l}</div>
                  <div className="tabular mt-1 font-display text-[11px] font-semibold sm:text-base">{k.v}</div>
                  <div className="mt-1 text-[9px] text-emerald-400">{k.d}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div className="mb-2 flex justify-between text-[10px] text-white/50"><span>Fluxo financeiro</span><span>12 meses</span></div>
              <div className="flex h-28 items-end gap-1.5 sm:h-40">
                {bars.map((h, i) => (
                  <motion.div key={i} className="flex flex-1 flex-col justify-end gap-0.5" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.8 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="rounded-t-[3px] bg-gradient-to-t from-[#7b6dff]/60 to-[#8f83ff]" style={{ height: '62%' }} />
                    <div className="rounded-b-[3px] bg-[#22d3ee]/40" style={{ height: '38%' }} />
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="text-[10px] text-white/50">Para onde vai meu dinheiro?</div>
                {[['Moradia', 46, '#2a78d6'], ['Alimentação', 24, '#eb6834'], ['Transporte', 13, '#eda100']].map(([n, p, c]) => (
                  <div key={n as string} className="mt-2">
                    <div className="flex justify-between text-[10px]"><span className="text-white/70">{n}</span><span className="text-white/50">{p}%</span></div>
                    <div className="mt-1 h-1 rounded-full bg-white/10"><motion.div className="h-1 rounded-full" style={{ background: c as string }} initial={{ width: 0 }} animate={{ width: `${(p as number) * 2}%` }} transition={{ delay: 1.2, duration: 0.8 }} /></div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="text-[10px] text-white/50">Saúde financeira</div>
                <div className="tabular mt-2 font-display text-2xl font-semibold">812</div>
                <div className="text-[10px] text-emerald-400">Excelente</div>
                <div className="mt-2 h-1 rounded-full bg-white/10"><div className="h-1 w-4/5 rounded-full bg-gradient-to-r from-[#7b6dff] to-[#22d3ee]" /></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cards flutuantes */}
      <motion.div aria-hidden initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0, y: [0, -8, 0] }} transition={{ opacity: { delay: 1.2 }, x: { delay: 1.2 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }} className="absolute border border-border bg-bg-elevated/95 backdrop-blur-xl top-[22%] -left-4 hidden w-52 rounded-2xl p-3.5 shadow-lg lg:-left-16 lg:block">
        <div className="flex items-center gap-2 text-xs text-fg-muted"><Target className="size-4 text-[#2a78d6]" /> Comprar carro</div>
        <div className="tabular mt-1 font-display text-lg font-semibold">37%</div>
        <div className="mt-1.5 h-1.5 rounded-full bg-surface-3"><div className="h-1.5 w-[37%] rounded-full bg-[#2a78d6]" /></div>
        <div className="mt-1 text-[10px] text-fg-subtle">R$ 18.500 de R$ 50.000</div>
      </motion.div>
      <motion.div aria-hidden initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0, y: [0, 10, 0] }} transition={{ opacity: { delay: 1.4 }, x: { delay: 1.4 }, y: { duration: 7, repeat: Infinity, ease: 'easeInOut' } }} className="absolute border border-border bg-bg-elevated/95 backdrop-blur-xl top-[10%] -right-4 hidden w-60 rounded-2xl p-3.5 shadow-lg lg:-right-14 lg:block">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary"><Bell className="size-4" /></span>
          <div>
            <p className="text-xs font-semibold">Fatura vence em 3 dias</p>
            <p className="text-[11px] text-fg-subtle">Nubank · R$ 1.692,26</p>
          </div>
        </div>
      </motion.div>
      <motion.div aria-hidden initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: [0, -6, 0] }} transition={{ opacity: { delay: 1.6 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }} className="absolute border border-border bg-bg-elevated/95 backdrop-blur-xl -right-2 bottom-[12%] hidden w-56 rounded-2xl p-3.5 shadow-lg md:block lg:-right-10">
        <div className="flex items-center gap-2 text-xs text-fg-muted"><PiggyBank className="size-4 text-emerald-500" /> Economia do mês</div>
        <div className="tabular mt-1 font-display text-lg font-semibold text-emerald-500">+R$ 3.260</div>
        <div className="flex items-center gap-1 text-[10px] text-fg-subtle"><TrendingUp className="size-3" /> 38% da renda guardada</div>
      </motion.div>
      <motion.div aria-hidden initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: [0, 8, 0] }} transition={{ opacity: { delay: 1.8 }, y: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' } }} className="absolute border border-border bg-bg-elevated/95 backdrop-blur-xl bottom-[4%] -left-2 hidden w-48 rounded-2xl p-3.5 shadow-lg md:block lg:-left-10">
        <div className="flex items-center gap-2 text-xs text-fg-muted"><CreditCard className="size-4 text-[#9085e9]" /> Limite disponível</div>
        <div className="tabular mt-1 font-display text-lg font-semibold">R$ 10.240</div>
      </motion.div>
    </div>
  );
}
