import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Banknote, Briefcase, Check, CreditCard, Home, Landmark, PiggyBank, ShoppingBag, Smartphone, Sparkles, Target, TrendingUp, Wallet, Shield, Plane, Car, GraduationCap,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Progress } from '@/components/ui/Progress';
import { ScoreGauge } from '@/components/common/ScoreGauge';
import { cn } from '@/lib/cn';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { uid } from '@/lib/id';
import { addMonths, today } from '@/lib/dates';
import { scoreBand } from '@/lib/score';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import type { AccountType, FinancialObjective } from '@/types';

const OBJECTIVES: { value: FinancialObjective; label: string; icon: typeof Target; desc: string }[] = [
  { value: 'organize', label: 'Organizar minhas finanças', icon: Sparkles, desc: 'Ter clareza de quanto entra e sai' },
  { value: 'save', label: 'Economizar dinheiro', icon: PiggyBank, desc: 'Gastar menos e guardar mais' },
  { value: 'debt_free', label: 'Sair das dívidas', icon: Banknote, desc: 'Plano para quitar o que devo' },
  { value: 'invest', label: 'Investir', icon: TrendingUp, desc: 'Fazer meu dinheiro crescer' },
  { value: 'emergency_fund', label: 'Criar reserva', icon: Shield, desc: 'Ter segurança para imprevistos' },
  { value: 'purchase', label: 'Comprar algo', icon: ShoppingBag, desc: 'Planejar uma conquista' },
  { value: 'business', label: 'Controlar minha empresa', icon: Briefcase, desc: 'Separar finanças e ver lucro' },
];

const ACCOUNT_OPTIONS: { type: AccountType; label: string; icon: typeof Landmark; color: string }[] = [
  { type: 'checking', label: 'Conta corrente', icon: Landmark, color: '#2a78d6' },
  { type: 'digital', label: 'Conta digital', icon: Smartphone, color: '#7b6dff' },
  { type: 'savings', label: 'Poupança', icon: PiggyBank, color: '#eda100' },
  { type: 'cash', label: 'Carteira (dinheiro)', icon: Wallet, color: '#1baf7a' },
];

const GOAL_OPTIONS = [
  { name: 'Reserva de emergência', icon: 'shield', lucide: Shield, color: '#1baf7a' },
  { name: 'Viagem', icon: 'plane', lucide: Plane, color: '#e87ba4' },
  { name: 'Comprar carro', icon: 'car', lucide: Car, color: '#2a78d6' },
  { name: 'Casa própria', icon: 'house', lucide: Home, color: '#eda100' },
  { name: 'Estudos', icon: 'graduation-cap', lucide: GraduationCap, color: '#4a3aa7' },
  { name: 'Aposentadoria', icon: 'trending-up', lucide: TrendingUp, color: '#008300' },
];

const STEPS = ['Objetivo', 'Renda e gastos', 'Contas e cartões', 'Metas', 'Diagnóstico'];

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const updateUser = useAuth((s) => s.updateUser);
  const finance = useFinance();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [objectives, setObjectives] = useState<FinancialObjective[]>([]);
  const toggleObjective = (v: FinancialObjective) => setObjectives((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));
  const wantsDebtFree = objectives.includes('debt_free');
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const [cards, setCards] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);

  const inc = parseMoneyInput(income) || 0;
  const exp = parseMoneyInput(expenses) || 0;

  const diagnosis = useMemo(() => {
    const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    const factors = [
      { label: 'Capacidade de poupança', value: Math.max(0, Math.min(100, (rate / 30) * 100)), weight: 0.35, text: inc > 0 ? `Sobra ${Math.max(0, rate).toFixed(0)}% da sua renda` : 'Informe sua renda' },
      { label: 'Equilíbrio do orçamento', value: inc >= exp && inc > 0 ? 100 : 0, weight: 0.15, text: exp <= inc ? 'Gastos dentro da renda' : 'Gastos acima da renda' },
      { label: 'Organização', value: Object.keys(accounts).length ? 100 : 30, weight: 0.15, text: `${Object.keys(accounts).length} conta(s) mapeada(s)` },
      { label: 'Dívidas', value: wantsDebtFree ? 40 : 80, weight: 0.2, text: wantsDebtFree ? 'Prioridade: quitar dívidas' : 'Sem dívidas declaradas como prioridade' },
      { label: 'Planejamento', value: goals.length ? 100 : 30, weight: 0.15, text: goals.length ? `${goals.length} meta(s) definida(s)` : 'Nenhuma meta definida' },
    ];
    const score = Math.round(factors.reduce((s, f) => s + f.value * f.weight, 0) * 10);
    return { score, factors, rate, band: scoreBand(score), leftover: inc - exp };
  }, [inc, exp, accounts, wantsDebtFree, goals]);

  const canNext = [objectives.length > 0, inc > 0 && exp >= 0 && expenses !== '', true, true, true][step];

  const go = (delta: number) => {
    setDir(delta);
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)));
  };

  const finish = (withDemo: boolean) => {
    if (withDemo) finance.loadDemo();
    else {
      const now = new Date().toISOString();
      for (const opt of ACCOUNT_OPTIONS) {
        if (accounts[opt.type] === undefined) continue;
        finance.upsert('accounts', { id: uid('acc'), name: opt.label, institution: opt.type === 'cash' ? 'Dinheiro físico' : 'Meu banco', type: opt.type, initialBalance: parseMoneyInput(accounts[opt.type]) || 0, color: opt.color, createdAt: now });
      }
      for (const g of goals) {
        const o = GOAL_OPTIONS.find((x) => x.name === g)!;
        const target = g === 'Reserva de emergência' && exp > 0 ? Math.round(exp * 6) : 10000;
        finance.upsert('goals', { id: uid('goal'), name: g, target, deadline: addMonths(today(), 12), icon: o.icon, color: o.color, initialAmount: 0, contributions: [], createdAt: now });
      }
    }
    finance.setOnboarding({ objective: objectives[0], objectives, monthlyIncome: inc, monthlyExpenses: exp, accountsCount: Object.keys(accounts).length, cardsCount: cards, goals, completedAt: new Date().toISOString() });
    updateUser({ onboarded: true });
    toast.success('Tudo pronto!', { description: withDemo ? 'Carregamos dados de exemplo para você explorar.' : 'Sua Nexora está configurada.' });
    navigate('/app', { replace: true });
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-48 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-[#7b6dff]/12 blur-[140px]" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-xs text-fg-subtle">
            Etapa {step + 1} de {STEPS.length} · {STEPS[step]}
          </span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-5" size="sm" label="Progresso do onboarding" />

        <div className="flex flex-1 flex-col justify-center py-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -32 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <section aria-labelledby="ob-0">
                  <h1 id="ob-0" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    Olá, {user?.name.split(' ')[0]}! Quais são seus objetivos financeiros?
                  </h1>
                  <p className="mt-2 text-sm text-fg-subtle">Selecione uma ou mais opções — vamos personalizar a Nexora para você.</p>
                  <div role="group" aria-labelledby="ob-0" className="mt-8 grid gap-3 sm:grid-cols-2">
                    {OBJECTIVES.map((o) => (
                      <button
                        key={o.value}
                        role="checkbox"
                        aria-checked={objectives.includes(o.value)}
                        onClick={() => toggleObjective(o.value)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all',
                          objectives.includes(o.value) ? 'border-primary bg-primary-soft shadow-[var(--ring)]' : 'border-border bg-surface hover:border-border-strong',
                        )}
                      >
                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', objectives.includes(o.value) ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-fg-muted')}>
                          <o.icon className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{o.label}</span>
                          <span className="block text-xs text-fg-subtle">{o.desc}</span>
                        </span>
                        <span aria-hidden className={cn('ml-auto grid size-5 shrink-0 place-items-center rounded-md border transition-colors', objectives.includes(o.value) ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong')}>
                          {objectives.includes(o.value) && <Check className="size-3.5" />}
                        </span>
                      </button>
                    ))}
                  </div>
                {objectives.length > 0 && (
                    <p className="mt-4 text-sm text-fg-muted" aria-live="polite">
                      {objectives.length} {objectives.length === 1 ? 'objetivo selecionado' : 'objetivos selecionados'}
                    </p>
                  )}
                </section>
              )}

              {step === 1 && (
                <section aria-labelledby="ob-1">
                  <h1 id="ob-1" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Quanto entra e quanto sai por mês?</h1>
                  <p className="mt-2 text-sm text-fg-subtle">Uma estimativa já basta. Você poderá ajustar depois.</p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Field label="Renda mensal" hint="Salário, freelas e outras entradas">
                      {(p) => <Input {...p} inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="R$ 0,00" className="h-14 text-lg" data-autofocus />}
                    </Field>
                    <Field label="Gastos médios" hint="Quanto você costuma gastar no mês">
                      {(p) => <Input {...p} inputMode="decimal" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="R$ 0,00" className="h-14 text-lg" />}
                    </Field>
                  </div>
                  {inc > 0 && expenses !== '' && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn('mt-5 rounded-xl px-4 py-3 text-sm', diagnosis.leftover >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                      {diagnosis.leftover >= 0
                        ? `Sobram ${formatMoney(diagnosis.leftover)} por mês (${diagnosis.rate.toFixed(0)}% da renda).`
                        : `Faltam ${formatMoney(-diagnosis.leftover)} por mês. Vamos te ajudar a equilibrar.`}
                    </motion.p>
                  )}
                </section>
              )}

              {step === 2 && (
                <section aria-labelledby="ob-2">
                  <h1 id="ob-2" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Quais contas você usa?</h1>
                  <p className="mt-2 text-sm text-fg-subtle">Selecione e informe o saldo atual (opcional).</p>
                  <div className="mt-8 space-y-3">
                    {ACCOUNT_OPTIONS.map((o) => {
                      const on = accounts[o.type] !== undefined;
                      return (
                        <div key={o.type} className={cn('flex items-center gap-3 rounded-2xl border p-3 transition-colors', on ? 'border-primary bg-primary-soft' : 'border-border bg-surface')}>
                          <button
                            onClick={() =>
                              setAccounts((a) => {
                                const n = { ...a };
                                if (on) delete n[o.type];
                                else n[o.type] = '';
                                return n;
                              })
                            }
                            aria-pressed={on}
                            className="flex flex-1 items-center gap-3 text-left"
                          >
                            <span className="grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${o.color} 18%, transparent)`, color: o.color }}>
                              <o.icon className="size-5" aria-hidden />
                            </span>
                            <span className="text-sm font-medium">{o.label}</span>
                            {on && <Check className="ml-auto size-4 text-primary" aria-hidden />}
                          </button>
                          {on && (
                            <input
                              aria-label={`Saldo de ${o.label}`}
                              inputMode="decimal"
                              placeholder="Saldo R$"
                              value={accounts[o.type]}
                              onChange={(e) => setAccounts((a) => ({ ...a, [o.type]: e.target.value }))}
                              className="h-10 w-32 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
                    <span className="flex items-center gap-3 text-sm font-medium">
                      <CreditCard className="size-5 text-fg-muted" aria-hidden />
                      <span>
                        Cartões de crédito
                        <span className="block text-xs font-normal text-fg-subtle">Opcional — deixe em 0 para pular</span>
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="icon-sm" variant="secondary" onClick={() => setCards((c) => Math.max(0, c - 1))} aria-label="Menos cartões">−</Button>
                      <span className="tabular w-6 text-center font-semibold" aria-live="polite">{cards}</span>
                      <Button size="icon-sm" variant="secondary" onClick={() => setCards((c) => Math.min(10, c + 1))} aria-label="Mais cartões">+</Button>
                    </div>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section aria-labelledby="ob-3">
                  <h1 id="ob-3" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">O que você quer conquistar?</h1>
                  <p className="mt-2 text-sm text-fg-subtle">Escolha uma ou mais metas. Criaremos cada uma para você acompanhar.</p>
                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {GOAL_OPTIONS.map((g) => {
                      const on = goals.includes(g.name);
                      return (
                        <button
                          key={g.name}
                          aria-pressed={on}
                          onClick={() => setGoals((list) => (on ? list.filter((x) => x !== g.name) : [...list, g.name]))}
                          className={cn('flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-all', on ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-border-strong')}
                        >
                          <span className="grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${g.color} 18%, transparent)`, color: g.color }}>
                            <g.lucide className="size-5" aria-hidden />
                          </span>
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {step === 4 && (
                <section aria-labelledby="ob-4" className="text-center">
                  <p className="text-xs font-medium tracking-wider text-primary uppercase">Diagnóstico financeiro</p>
                  <h1 id="ob-4" className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Seu ponto de partida</h1>
                  <div className="mt-6 flex justify-center">
                    <ScoreGauge score={diagnosis.score} label={diagnosis.band.label} />
                  </div>
                  <p className="mx-auto mt-2 max-w-md text-xs text-fg-subtle">
                    Score inicial estimado a partir das suas respostas (0–1000). Ele será recalculado com seus dados reais. Não é score de crédito.
                  </p>
                  <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left">
                    {diagnosis.factors.map((f) => (
                      <li key={f.label} className="card p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{f.label}</span>
                          <span className="tabular text-xs text-fg-subtle">{Math.round(f.value)}/100</span>
                        </div>
                        <Progress value={f.value} size="sm" className="mt-2" label={f.label} />
                        <p className="mt-1.5 text-xs text-fg-subtle">{f.text}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
                    <Button size="lg" className="w-full sm:flex-1" onClick={() => finish(false)}>
                      Começar do zero
                    </Button>
                    <Button size="lg" variant="secondary" className="w-full sm:flex-1" onClick={() => finish(true)}>
                      Explorar com dados de exemplo
                    </Button>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {step < 4 && (
          <div className="flex items-center justify-between gap-3 pb-[env(safe-area-inset-bottom)]">
            <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0} leftIcon={<ArrowLeft className="size-4" />}>
              Voltar
            </Button>
            <Button onClick={() => go(1)} disabled={!canNext} rightIcon={<ArrowRight className="size-4" />}>
              {step === 3 ? 'Ver diagnóstico' : 'Continuar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
