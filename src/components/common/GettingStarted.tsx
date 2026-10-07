import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, CreditCard, Landmark, Rocket, Target, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useSettings } from '@/store/settings';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/cn';

interface Step {
  key: string;
  title: string;
  desc: string;
  cta: string;
  done: boolean;
  /** Pulado pelo usuário (só itens opcionais). */
  skipped?: boolean;
  optional?: boolean;
  icon: typeof Landmark;
  action: () => void;
}

/** Itens do roteiro de início, marcados automaticamente a partir dos dados. */
export function useGettingStarted() {
  const data = useFinanceData();
  const openTx = useUI((s) => s.openTransaction);
  const navigate = useNavigate();
  const skippedSteps = useSettings((s) => s.tutorials.skippedSteps);
  const raw: Step[] = [
    {
      key: 'account',
      title: 'Cadastre suas contas',
      desc: 'Banco, conta digital, poupança ou dinheiro em espécie — com o saldo de hoje.',
      cta: 'Adicionar conta',
      done: data.accounts.length > 0,
      icon: Landmark,
      action: () => navigate('/app/contas?nova=1'),
    },
    {
      key: 'income',
      title: 'Registre sua renda',
      desc: 'Salário, freelas e outras entradas. Marque como mensal o que se repete.',
      cta: 'Adicionar receita',
      done: data.transactions.some((t) => t.type === 'income'),
      icon: TrendingUp,
      action: () => openTx({ type: 'income' }),
    },
    {
      key: 'expense',
      title: 'Registre suas despesas',
      desc: 'Aluguel, mercado, transporte… comece pelas contas fixas do mês.',
      cta: 'Adicionar despesa',
      done: data.transactions.some((t) => t.type === 'expense'),
      icon: TrendingDown,
      action: () => openTx({ type: 'expense' }),
    },
    {
      key: 'card',
      title: 'Adicione seus cartões',
      desc: 'Acompanhe limite, faturas e receba aviso antes do vencimento.',
      cta: 'Adicionar cartão',
      done: data.cards.length > 0,
      optional: true,
      icon: CreditCard,
      action: () => navigate('/app/cartoes?novo=1'),
    },
    {
      key: 'budget',
      title: 'Defina um orçamento',
      desc: 'Um limite mensal para a categoria em que você mais gasta.',
      cta: 'Criar orçamento',
      done: data.budgets.length > 0,
      icon: Wallet,
      action: () => navigate('/app/orcamentos?novo=1'),
    },
    {
      key: 'goal',
      title: 'Crie uma meta',
      desc: 'Reserva, viagem, carro… veja quanto guardar por mês.',
      cta: 'Criar meta',
      done: data.goals.length > 0,
      icon: Target,
      action: () => navigate('/app/metas?nova=1'),
    },
  ];
  // Itens opcionais pulados contam como concluídos (ex.: quem não quer cadastrar cartão agora).
  const steps = raw.map((s) => (s.optional && !s.done && skippedSteps?.includes(s.key) ? { ...s, done: true, skipped: true } : s));
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, total: steps.length, complete: doneCount === steps.length, next: steps.find((s) => !s.done) };
}

/** Checklist "Primeiros passos" exibido no dashboard até o usuário concluir o básico. */
export function GettingStarted({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { steps, doneCount, total, next } = useGettingStarted();
  const hide = useSettings((s) => s.setChecklistHidden);
  const setSkipped = useSettings((s) => s.setStepSkipped);

  return (
    <Card data-tour="getting-started" className={cn('overflow-hidden', variant === 'full' && 'holo')}>
      <div className="flex items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Rocket className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-tight">Primeiros passos</h2>
            <p className="text-sm text-fg-subtle">
              {variant === 'full' ? 'Siga a ordem abaixo para montar seu painel. Cada item é marcado automaticamente.' : 'Complete para aproveitar tudo da Nexora.'}
            </p>
          </div>
        </div>
        {variant === 'compact' && (
          <Button variant="ghost" size="icon-sm" aria-label="Ocultar primeiros passos" onClick={() => hide(true)}>
            <X className="size-4" />
          </Button>
        )}
      </div>
      <div className="px-5 pt-4 sm:px-6">
        <div className="flex items-center justify-between text-xs text-fg-subtle">
          <span>
            {doneCount} de {total} concluídos
          </span>
          <span className="tabular">{Math.round((doneCount / total) * 100)}%</span>
        </div>
        <Progress value={(doneCount / total) * 100} size="sm" className="mt-1.5" label="Progresso dos primeiros passos" />
      </div>
      <ol className={cn('grid gap-2 p-5 sm:p-6', variant === 'compact' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2')}>
        {steps.map((s, i) => {
          const isNext = next?.key === s.key;
          return (
            <motion.li
              key={s.key}
              data-tour={`gs-${s.key}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 transition-colors',
                s.done ? 'border-transparent bg-success-soft/60' : isNext ? 'border-primary/50 bg-primary-soft/60' : 'border-border bg-surface-2/40',
              )}
            >
              <span
                className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold', s.done ? 'bg-success text-white' : isNext ? 'bg-primary text-primary-fg' : 'bg-surface-3 text-fg-muted')}
                aria-hidden
              >
                {s.done ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('flex flex-wrap items-center gap-1.5 text-sm font-medium', s.done && 'text-fg-muted line-through decoration-1')}>
                  {s.title}
                  {s.optional && <Badge>{s.skipped ? 'Pulado' : 'Opcional'}</Badge>}
                  <span className="sr-only">{s.skipped ? '(pulado)' : s.done ? '(concluído)' : '(pendente)'}</span>
                </p>
                {!s.done && <p className="mt-0.5 text-xs text-fg-subtle">{s.desc}</p>}
                {!s.done && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant={isNext ? 'primary' : 'secondary'} rightIcon={<ArrowRight className="size-3.5" />} onClick={s.action}>
                      {s.cta}
                    </Button>
                    {s.optional && (
                      <Button size="sm" variant="ghost" onClick={() => setSkipped(s.key, true)}>
                        Agora não
                      </Button>
                    )}
                  </div>
                )}
                {s.skipped && (
                  <button type="button" onClick={() => setSkipped(s.key, false)} className="mt-1 text-left text-xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline">
                    Mostrar de novo
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </Card>
  );
}
