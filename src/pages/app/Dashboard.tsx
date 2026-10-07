import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarClock, CreditCard, PiggyBank, Repeat2, Sparkles, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { StatCard } from '@/components/common/StatCard';
import { PeriodFilter } from '@/components/common/PeriodFilter';
import { InsightList } from '@/components/common/InsightList';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { FlowChart } from '@/components/charts/FlowChart';
import { Legend } from '@/components/charts/ChartTooltip';
import { Donut } from '@/components/charts/Donut';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useMoney } from '@/hooks/useMoney';
import { usePeriod } from '@/hooks/usePeriod';
import { useLookups } from '@/hooks/useLookups';
import { useAuth } from '@/store/auth';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { GettingStarted, useGettingStarted } from '@/components/common/GettingStarted';
import { Deferred } from '@/components/common/Deferred';
import { useSettings } from '@/store/settings';
import { useUI } from '@/store/ui';
import {
  autoGranularity, balanceHistory, cardSummary, goalProgress, netWorth, portfolioSummary, subscriptionsSummary, summarize, timeSeries, totalsByCategory, type Granularity,
} from '@/lib/finance';
import { generateInsights } from '@/lib/insights';
import { addDays, diffDays, formatDate, formatDayMonth, monthName, today } from '@/lib/dates';
import { pctChange } from '@/lib/format';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? t('Bom dia') : h < 18 ? t('Boa tarde') : t('Boa noite');
}

export default function Dashboard() {
  const data = useFinanceData();
  const user = useAuth((s) => s.user);
  const openTx = useUI((s) => s.openTransaction);
  const money = useMoney();
  const lookups = useLookups();
  const { preset, setPreset, custom, setCustom, period, previous } = usePeriod('30d');
  const [gran, setGran] = useState<Granularity | 'auto'>('auto');

  const m = useMemo(() => {
    const cur = summarize(data.transactions, period);
    const prev = summarize(data.transactions, previous);
    const nw = netWorth(data);
    const history = balanceHistory(data.accounts, data.transactions, period);
    const prevBalance = history[0]?.balance ?? 0;
    const portfolio = portfolioSummary(data.investments);
    const series = timeSeries(data.transactions, period, gran === 'auto' ? autoGranularity(period) : gran);
    const cats = totalsByCategory(data.transactions, data.categories, period, 'expense');
    return { cur, prev, nw, history, prevBalance, portfolio, series, cats };
  }, [data, period, previous, gran]);

  const insights = useMemo(() => generateInsights(data, period, previous, (v) => money(v)), [data, period, previous, money]);
  const goals = useMemo(() => data.goals.map((g) => goalProgress(g)), [data.goals]);
  const recent = useMemo(() => [...data.transactions].filter((x) => x.date <= today()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 7), [data.transactions]);

  const upcoming = useMemo(() => {
    const ref = today();
    const limit = addDays(ref, 30);
    const items: { id: string; label: string; date: string; amount: number; kind: string; href: string }[] = [];
    for (const c of data.cards) {
      const s = cardSummary(c, data.transactions);
      for (const inv of [s.pending, s.current].filter(Boolean)) {
        if (inv && inv.total - inv.paid > 0 && inv.dueDate <= limit) items.push({ id: inv.id, label: t('Fatura {name}', { name: c.name }), date: inv.dueDate, amount: inv.total - inv.paid, kind: inv.status === 'overdue' ? t('Atrasada') : inv.status === 'open' ? t('Aberta') : t('Fechada'), href: '/app/cartoes' });
      }
    }
    for (const u of subscriptionsSummary(data.subscriptions).upcoming) if (u.date <= limit) items.push({ id: u.sub.id, label: u.sub.name, date: u.date, amount: u.sub.amount, kind: t('Assinatura'), href: '/app/assinaturas' });
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [data]);

  const firstName = user?.name.split(' ')[0] ?? '';
  const hasData = data.transactions.length > 0;
  // Sem lançamentos: tutorial de boas-vindas (como começar). Com dados: tutorial do painel.
  const tourId = hasData ? 'dashboard' : 'welcome';
  usePageTour(tourId);
  const checklist = useGettingStarted();
  const checklistHidden = useSettings((s) => s.tutorials.checklistHidden);
  const balanceSpark = m.history.filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 30)) === 0 || i === arr.length - 1).map((h) => h.balance);
  const savingsPrev = m.prev.net;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-fg-subtle">
              {greeting()} · {formatDate(today())}
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{t('Olá, {name} 👋', { name: firstName })}</h1>
          </div>
          <TourButton id={tourId} className="lg:hidden" />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <TourButton id={tourId} className="hidden lg:inline-flex" />
          {hasData && <PeriodFilter preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom} />}
        </div>
      </div>

      {!hasData ? (
        <GettingStarted variant="full" />
      ) : (
        <>
          {!checklist.complete && !checklistHidden && <GettingStarted variant="compact" />}
          {/* 1–2. Saldo, entradas/saídas e KPIs */}
          <section data-tour="kpis" aria-label={t('Resumo financeiro')} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              emphasis
              className="col-span-2 lg:col-span-1"
              label={t('Saldo total')}
              icon={<Wallet />}
              value={m.nw.cash}
              format={(v) => money(v)}
              delta={pctChange(m.nw.cash, m.prevBalance)}
              comparison={t('vs. {value} em {date}', { value: money(m.prevBalance, { compact: true }), date: formatDayMonth(period.from) })}
              spark={balanceSpark}
              info={t('Soma dos saldos de todas as contas (exceto investimentos), considerando transações até hoje.')}
            />
            <StatCard label={t('Entradas')} icon={<ArrowDownLeft />} value={m.cur.income} format={(v) => money(v)} delta={pctChange(m.cur.income, m.prev.income)} comparison={t('ant. {value}', { value: money(m.prev.income, { compact: true }) })} spark={m.series.map((s) => s.income)} sparkColor="var(--series-income)" info={t('Total de receitas no período selecionado, comparado ao período anterior de mesma duração.')} />
            <StatCard label={t('Saídas')} icon={<ArrowUpRight />} value={m.cur.expense} format={(v) => money(v)} inverse delta={pctChange(m.cur.expense, m.prev.expense)} comparison={t('ant. {value}', { value: money(m.prev.expense, { compact: true }) })} spark={m.series.map((s) => s.expense)} sparkColor="var(--series-expense)" info={t('Total de despesas (inclui compras no cartão pela data da compra). Transferências não contam.')} />
            <StatCard className="hidden sm:flex" label={t('Economia')} icon={<PiggyBank />} value={m.cur.net} format={(v) => money(v)} delta={pctChange(m.cur.net, savingsPrev)} comparison={t('{pct}% da renda', { pct: m.cur.savingsRate.toFixed(0) })} spark={m.series.map((s) => s.net)} sparkColor="var(--series-net)" info={t('Entradas − saídas no período. A porcentagem indica quanto da renda foi poupado.')} />
          </section>

          {/* 3. Fluxo financeiro + categorias */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card data-tour="flow-chart" className="lg:col-span-2">
              <CardHeader
                title={t('Fluxo financeiro')}
                description={t('Receitas, despesas e resultado no período')}
                action={
                  <Segmented
                    size="sm"
                    label={t('Agrupamento')}
                    value={gran}
                    onChange={setGran}
                    options={[
                      { value: 'auto', label: t('Auto') },
                      { value: 'day', label: t('Dia') },
                      { value: 'week', label: t('Semana') },
                      { value: 'month', label: t('Mês') },
                    ]}
                    className="hidden sm:inline-flex"
                  />
                }
              />
              <CardBody className="pt-4">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <Legend
                    items={[
                      { label: t('Receitas'), color: 'var(--series-income)' },
                      { label: t('Despesas'), color: 'var(--series-expense)' },
                      { label: t('Resultado'), color: 'var(--series-net)', dashed: true },
                    ]}
                  />
                  <p className="text-xs text-fg-subtle">
                    {t('Resultado:')} <span className={cn('tabular font-semibold', m.cur.net >= 0 ? 'text-success' : 'text-danger')}>{money(m.cur.net, { signed: true })}</span>
                  </p>
                </div>
                <FlowChart data={m.series} height={280} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('Para onde vai meu dinheiro?')} description={t('Despesas por categoria')} action={<Link to="/app/analises" className="text-xs font-medium text-primary hover:underline">{t('Detalhes')}</Link>} />
              <CardBody>
                {m.cats.length ? (
                  <>
                    <Donut
                      size={190}
                      total={m.cur.expense}
                      data={m.cats.slice(0, 6).map((c) => ({ id: c.category.id, label: t(c.category.name), value: c.total, color: c.category.color, pct: c.pct }))}
                    />
                    <ul className="mt-4 space-y-2">
                      {m.cats.slice(0, 4).map((c) => (
                        <li key={c.category.id} className="flex items-center gap-2 text-sm">
                          <span className="size-2.5 rounded-full" style={{ background: c.category.color }} aria-hidden />
                          <span className="flex-1 truncate text-fg-muted">{t(c.category.name)}</span>
                          <span className="tabular text-xs text-fg-subtle">{c.pct.toFixed(0)}%</span>
                          <span className="tabular w-24 text-right font-medium">{money(c.total)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-fg-subtle">{t('Sem despesas no período.')}</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* 4. Ações rápidas */}
          {/* No celular o botão "+" da barra inferior já faz isso. */}
          <section data-tour="quick-actions" aria-label={t('Ações rápidas')} className="hidden grid-cols-4 gap-2 sm:grid sm:gap-3">
            {[
              { label: t('Receita'), icon: TrendingUp, color: 'var(--series-income)', onClick: () => openTx({ type: 'income' }) },
              { label: t('Despesa'), icon: TrendingDown, color: 'var(--series-expense)', onClick: () => openTx({ type: 'expense' }) },
              { label: t('Transferir'), icon: Repeat2, color: 'var(--series-net)', onClick: () => openTx({ type: 'transfer' }) },
              { label: t('Faturas'), icon: CreditCard, color: 'var(--series-7)', to: '/app/cartoes' },
            ].map((a) => {
              const inner = (
                <>
                  <span className="grid size-10 place-items-center rounded-xl transition-transform group-hover:scale-110" style={{ background: `color-mix(in oklab, ${a.color} 16%, transparent)`, color: a.color }}>
                    <a.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-xs font-medium sm:text-sm">{a.label}</span>
                </>
              );
              const cls = 'card group flex flex-col items-center gap-2 py-4 transition-colors hover:border-border-strong sm:flex-row sm:justify-center sm:gap-3';
              return a.to ? (
                <Link key={a.label} to={a.to} className={cls}>
                  {inner}
                </Link>
              ) : (
                <motion.button key={a.label} whileTap={{ scale: 0.97 }} onClick={a.onClick} className={cls}>
                  {inner}
                </motion.button>
              );
            })}
          </section>

          {/* 5. Transações + próximos vencimentos */}
          <Deferred minHeight={420}>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title={t('Transações recentes')} action={<Link to="/app/transacoes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">{t('Ver todas')} <ArrowRight className="size-3" /></Link>} />
              <CardBody className="px-3 pt-3">
                {recent.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    category={tx.categoryId ? lookups.category.get(tx.categoryId) : undefined}
                    account={tx.accountId ? lookups.account.get(tx.accountId) : undefined}
                    toAccount={tx.toAccountId ? lookups.account.get(tx.toAccountId) : undefined}
                    card={tx.cardId ? lookups.card.get(tx.cardId) : undefined}
                    onClick={() => openTx({ type: tx.type, editing: tx })}
                  />
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('Contas a pagar')} description={t('Próximos 30 dias')} icon={<CalendarClock />} />
              <CardBody className="pt-3">
                {upcoming.length ? (
                  <ul className="divide-y divide-border">
                    {upcoming.map((u) => {
                      const days = diffDays(today(), u.date);
                      return (
                        <li key={u.id}>
                          <Link to={u.href} className="flex items-center gap-3 py-2.5">
                            <div className="grid w-11 shrink-0 place-items-center rounded-lg border border-border py-1 text-center">
                              <span className="text-[10px] text-fg-subtle uppercase">{monthName(u.date.slice(0, 7)).slice(0, 3)}</span>
                              <span className="font-display text-sm font-semibold">{u.date.slice(8)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{u.label}</p>
                              <p className={cn('text-xs', days < 0 ? 'text-danger' : days <= 3 ? 'text-warning' : 'text-fg-subtle')}>
                                {u.kind} · {days < 0 ? (days === -1 ? t('venceu há {n} dia', { n: -days }) : t('venceu há {n} dias', { n: -days })) : days === 0 ? t('vence hoje') : days === 1 ? t('em {n} dia', { n: days }) : t('em {n} dias', { n: days })}
                              </p>
                            </div>
                            <span className="tabular text-sm font-semibold">{money(u.amount)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-fg-subtle">{t('Nenhum vencimento nos próximos 30 dias.')}</p>
                )}
              </CardBody>
            </Card>
          </div>
          </Deferred>

          {/* 6–7. Metas e insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('Metas')} action={<Link to="/app/metas" className="text-xs font-medium text-primary hover:underline">{t('Ver metas')}</Link>} />
              <CardBody className="space-y-4">
                {goals.length ? (
                  goals.slice(0, 3).map((g) => (
                    <div key={g.goal.id}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <CategoryIcon icon={g.goal.icon} color={g.goal.color} size="sm" />
                        <span className="flex-1 truncate text-sm font-medium">{g.goal.name}</span>
                        <span className="tabular text-xs font-semibold">{g.pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={g.pct} color={g.goal.color} label={t('Progresso da meta {name}', { name: g.goal.name })} />
                      <p className="mt-1 text-xs text-fg-subtle">
                        {t('{current} de {target}', { current: money(g.current, { compact: true }), target: money(g.goal.target, { compact: true }) })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-fg-subtle">{t('Crie uma meta para acompanhar seu progresso.')}</p>
                )}
              </CardBody>
            </Card>
            <Card data-tour="insights">
              <CardHeader title="Nexora Insights" icon={<Sparkles />} />
              <CardBody className="px-3 pt-3">
                <InsightList insights={insights} limit={4} />
              </CardBody>
            </Card>
          </div>

        </>
      )}
    </div>
  );
}
