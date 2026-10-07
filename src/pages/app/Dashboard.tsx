import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUp, CalendarClock, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { InsightList } from '@/components/common/InsightList';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useMoney } from '@/hooks/useMoney';
import { useLookups } from '@/hooks/useLookups';
import { useAuth } from '@/store/auth';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { GettingStarted, useGettingStarted } from '@/components/common/GettingStarted';
import { useSettings } from '@/store/settings';
import { useUI } from '@/store/ui';
import { cardSummary, previousPeriod, subscriptionsSummary, summarize, totalBalance, totalsByCategory } from '@/lib/finance';
import { generateInsights } from '@/lib/insights';
import { spendingAllowance, suggestions } from '@/lib/assistant';
import { addDays, diffDays, monthName, startOfMonth, today } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? t('Bom dia') : h < 18 ? t('Boa tarde') : t('Boa noite');
}

/**
 * Início — simples e direto, no estilo de um assistente:
 * quanto dá para gastar, o resumo do mês em uma linha, o que vence e uma conversa
 * com a Nexora AI. Os gráficos detalhados ficam em Análises.
 */
export default function Dashboard() {
  const data = useFinanceData();
  const user = useAuth((s) => s.user);
  const openTx = useUI((s) => s.openTransaction);
  const money = useMoney();
  const lookups = useLookups();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');

  const ref = today();
  const month = useMemo(() => ({ from: startOfMonth(ref), to: ref }), [ref]);
  const sum = useMemo(() => summarize(data.transactions, month), [data.transactions, month]);
  const balance = useMemo(() => totalBalance(data.accounts, data.transactions), [data.accounts, data.transactions]);
  const allowance = useMemo(() => spendingAllowance(data, ref), [data, ref]);
  const cats = useMemo(() => totalsByCategory(data.transactions, data.categories, month, 'expense').slice(0, 4), [data, month]);
  const insights = useMemo(() => generateInsights(data, month, previousPeriod(month), (v) => money(v)), [data, month, money]);
  const recent = useMemo(
    () => [...data.transactions].filter((x) => x.date <= ref).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [data.transactions, ref],
  );

  const upcoming = useMemo(() => {
    const limit = addDays(ref, 30);
    const items: { id: string; label: string; date: string; amount: number; href: string }[] = [];
    for (const c of data.cards) {
      const s = cardSummary(c, data.transactions);
      for (const inv of [s.pending, s.current].filter(Boolean)) {
        if (inv && inv.total - inv.paid > 0 && inv.dueDate <= limit) items.push({ id: inv.id, label: t('Fatura {name}', { name: c.name }), date: inv.dueDate, amount: inv.total - inv.paid, href: '/app/cartoes' });
      }
    }
    for (const u of subscriptionsSummary(data.subscriptions).upcoming) if (u.date <= limit) items.push({ id: u.sub.id, label: u.sub.name, date: u.date, amount: u.sub.amount, href: '/app/assinaturas' });
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [data, ref]);

  const firstName = user?.name.split(' ')[0] ?? '';
  const hasData = data.transactions.length > 0;
  const tourId = hasData ? 'dashboard' : 'welcome';
  usePageTour(tourId);
  const checklist = useGettingStarted();
  const checklistHidden = useSettings((s) => s.tutorials.checklistHidden);

  const ask = (q: string) => {
    const text = q.trim();
    if (text) navigate(`/app/assistente?q=${encodeURIComponent(text)}`);
  };

  const left = sum.income - sum.expense;
  const totalCats = cats.reduce((s, c) => s + c.total, 0) || 1;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-fg-subtle">{greeting()}</p>
          <h1 className="mt-0.5 truncate font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{t('Olá, {name} 👋', { name: firstName })}</h1>
        </div>
        <TourButton id={tourId} />
      </div>

      {!hasData ? (
        <GettingStarted variant="full" />
      ) : (
        <>
          {!checklist.complete && !checklistHidden && <GettingStarted variant="compact" />}

          {/* Quanto posso gastar + resumo do mês */}
          <motion.section
            data-tour="kpis"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card holo relative overflow-hidden p-5 sm:p-7"
            aria-label={t('Resumo do mês')}
          >
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[#7b6dff]/20 blur-3xl" aria-hidden />
            <p className="relative text-sm font-medium text-fg-muted">{t('Você pode gastar hoje')}</p>
            {allowance.perDay > 0 ? (
              <>
                <p className="tabular relative mt-1 font-display text-[40px] leading-tight font-semibold tracking-tight sm:text-5xl">{money(allowance.perDay)}</p>
                <p className="relative mt-1 text-sm text-fg-subtle">
                  {t('por dia até o fim do mês ({n} dias), guardando 20% da renda e com as contas pagas.', { n: allowance.daysLeft })}
                </p>
              </>
            ) : (
              <>
                <p className="relative mt-1 font-display text-3xl font-semibold text-warning">{t('Sem folga este mês')}</p>
                <p className="relative mt-1 text-sm text-fg-subtle">{t('Com as contas previstas, faltam {valor}. Priorize o essencial.', { valor: money(Math.abs(allowance.free)) })}</p>
              </>
            )}
            <dl className="relative mt-6 grid grid-cols-3 gap-2 border-t border-border pt-4 text-sm">
              <div>
                <dt className="text-xs text-fg-subtle">{t('Entrou no mês')}</dt>
                <dd className="tabular mt-0.5 font-semibold text-success">{money(sum.income)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">{t('Saiu no mês')}</dt>
                <dd className="tabular mt-0.5 font-semibold">{money(sum.expense)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">{t('Saldo nas contas')}</dt>
                <dd className={cn('tabular mt-0.5 font-semibold', balance < 0 && 'text-danger')}>{money(balance)}</dd>
              </div>
            </dl>
            <p className="relative mt-3 text-xs text-fg-subtle">
              {left >= 0 ? t('Até agora sobraram {valor} este mês.', { valor: money(left) }) : t('Este mês você gastou {valor} a mais do que entrou.', { valor: money(-left) })}
            </p>
          </motion.section>

          {/* Converse com a Nexora AI */}
          <section data-tour="ai-home" className="card p-4 sm:p-5" aria-label={t('Pergunte à Nexora AI')}>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden /> {t('Pergunte ou registre conversando')}
            </p>
            <form
              className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 p-1.5 focus-within:border-primary"
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
            >
              <label htmlFor="home-ask" className="sr-only">{t('Pergunte à Nexora AI')}</label>
              <input
                id="home-ask"
                value={question}
                maxLength={300}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('Ex.: “gastei 30 no mercado”')}
                className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-fg-subtle"
              />
              <button type="submit" disabled={!question.trim()} aria-label={t('Enviar')} className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg disabled:opacity-40">
                <ArrowUp className="size-4" aria-hidden />
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions().slice(0, 3).map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-primary/50 hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Próximas contas */}
            <Card>
              <CardHeader title={t('Próximas contas')} description={t('Próximos 30 dias')} icon={<CalendarClock />} />
              <CardBody className="pt-2">
                {upcoming.length ? (
                  <ul className="divide-y divide-border">
                    {upcoming.map((u) => {
                      const days = diffDays(ref, u.date);
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
                                {days < 0 ? (days === -1 ? t('venceu há {n} dia', { n: -days }) : t('venceu há {n} dias', { n: -days })) : days === 0 ? t('vence hoje') : days === 1 ? t('em {n} dia', { n: days }) : t('em {n} dias', { n: days })}
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

            {/* Onde foi o dinheiro */}
            <Card>
              <CardHeader
                title={t('Onde seu dinheiro foi')}
                description={t('Maiores gastos deste mês')}
                action={<Link to="/app/analises" className="text-xs font-medium text-primary hover:underline">{t('Ver análises')}</Link>}
              />
              <CardBody className="space-y-4 pt-3">
                {cats.length ? (
                  cats.map((c) => (
                    <div key={c.category.id}>
                      <div className="mb-1.5 flex items-center gap-2 text-sm">
                        <CategoryIcon icon={c.category.icon} color={c.category.color} size="sm" />
                        <span className="flex-1 truncate font-medium">{t(c.category.name)}</span>
                        <span className="tabular font-semibold">{money(c.total)}</span>
                      </div>
                      <Progress value={(c.total / totalCats) * 100} color={c.category.color} size="sm" label={t(c.category.name)} />
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-fg-subtle">{t('Sem despesas no período.')}</p>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('Últimas transações')} action={<Link to="/app/transacoes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">{t('Ver todas')} <ArrowRight className="size-3" /></Link>} />
              <CardBody className="px-3 pt-2">
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
            <Card data-tour="insights">
              <CardHeader title={t('Dicas para você')} icon={<Sparkles />} />
              <CardBody className="px-3 pt-2">
                <InsightList insights={insights} limit={3} />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
