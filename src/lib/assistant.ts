import type { FinanceData } from '@/types';
import {
  accountBalances,
  budgetUsage,
  cardSummary,
  debtTotals,
  goalProgress,
  inPeriod,
  isRealized,
  monthlyAverages,
  netWorth,
  portfolioSummary,
  subscriptionsSummary,
  summarize,
  totalsByCategory,
  type Period,
} from './finance';
import { financialScore } from './score';
import { monthEvents } from './calendar';
import { addDays, addMonths, daysInMonth, diffDays, endOfMonth, formatDate, monthKey, startOfMonth, startOfWeek, today } from './dates';
import { formatMoney, formatPercent, pctChange } from './format';

/**
 * Nexora AI — assistente financeiro.
 *
 * Motor determinístico de intenções que responde SOMENTE com números calculados
 * a partir dos dados do usuário (nunca inventa valores). Para respostas em
 * linguagem livre com um LLM, envie a pergunta + o resumo `buildContext()` a um
 * endpoint do backend (a chave da API fica no servidor, nunca no frontend).
 */

export interface AssistantAnswer {
  text: string;
  facts?: { label: string; value: string }[];
  links?: { label: string; href: string }[];
  followUps?: string[];
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function parsePeriod(q: string, ref = today()): { period: Period; label: string } {
  if (/\bhoje\b/.test(q)) return { period: { from: ref, to: ref }, label: 'hoje' };
  if (/\bontem\b/.test(q)) return { period: { from: addDays(ref, -1), to: addDays(ref, -1) }, label: 'ontem' };
  if (/semana passada/.test(q)) {
    const s = addDays(startOfWeek(ref), -7);
    return { period: { from: s, to: addDays(s, 6) }, label: 'na semana passada' };
  }
  if (/(esta|essa|nesta|nessa) semana|semana/.test(q)) return { period: { from: startOfWeek(ref), to: ref }, label: 'nesta semana' };
  if (/mes passado|ultimo mes/.test(q)) {
    const s = startOfMonth(addMonths(ref, -1));
    return { period: { from: s, to: endOfMonth(s) }, label: 'no mês passado' };
  }
  if (/ultimos? 30 dias/.test(q)) return { period: { from: addDays(ref, -29), to: ref }, label: 'nos últimos 30 dias' };
  if (/ultimos? (3|tres) meses/.test(q)) return { period: { from: startOfMonth(addMonths(ref, -2)), to: ref }, label: 'nos últimos 3 meses' };
  if (/(este|esse|neste|nesse) ano|no ano/.test(q)) return { period: { from: `${ref.slice(0, 4)}-01-01`, to: ref }, label: 'neste ano' };
  const mi = MONTHS.findIndex((m) => q.includes(m));
  if (mi >= 0) {
    let y = Number(ref.slice(0, 4));
    if (mi + 1 > Number(ref.slice(5, 7))) y -= 1;
    const s = `${y}-${String(mi + 1).padStart(2, '0')}-01`;
    return { period: { from: s, to: endOfMonth(s) < ref ? endOfMonth(s) : ref }, label: `em ${MONTHS[mi].replace('marco', 'março')}` };
  }
  return { period: { from: startOfMonth(ref), to: ref }, label: 'neste mês' };
}

export const SUGGESTIONS = [
  'Quanto gastei este mês?',
  'Quanto posso gastar hoje?',
  'Qual foi minha maior despesa?',
  'Como estão minhas finanças?',
  'Quanto preciso economizar para atingir minha meta?',
  'Estou perto de ultrapassar algum orçamento?',
  'Quando vence minha fatura?',
  'Quanto tenho investido?',
];

export function answer(question: string, data: FinanceData, money: (v: number) => string = (v) => formatMoney(v)): AssistantAnswer {
  const q = norm(question);
  const ref = today();
  const { period, label } = parsePeriod(q, ref);
  const hasTx = data.transactions.length > 0;
  const noData: AssistantAnswer = {
    text: 'Ainda não há transações registradas, então não consigo calcular isso sem inventar números. Registre suas receitas e despesas e pergunte de novo.',
    links: [{ label: 'Adicionar transação', href: '/app/transacoes?nova=expense' }],
  };

  // --- Quanto posso gastar hoje?
  if (/posso gastar|disponivel para gastar|limite diario|gastar por dia/.test(q)) {
    if (!hasTx) return noData;
    const month = monthKey(ref);
    const cur = summarize(data.transactions, { from: startOfMonth(ref), to: ref });
    const avg = monthlyAverages(data.transactions, 3);
    const pendingIncome = monthEvents(data, month).filter((e) => e.kind === 'income' && !e.done && e.date > ref).reduce((s, e) => s + (e.amount ?? 0), 0);
    const expectedIncome = Math.max(cur.income + pendingIncome, avg.income);
    const pendingBills = monthEvents(data, month)
      .filter((e) => !e.done && e.date >= ref && ['bill', 'invoice', 'debt', 'subscription'].includes(e.kind) && !(e.kind === 'subscription' && data.subscriptions.find((s) => s.id === e.refId)?.cardId))
      .reduce((s, e) => s + (e.amount ?? 0), 0);
    const savingsTarget = expectedIncome * 0.2;
    const daysLeft = daysInMonth(Number(month.slice(0, 4)), Number(month.slice(5))) - Number(ref.slice(8)) + 1;
    const free = expectedIncome - cur.expense - pendingBills - savingsTarget;
    const perDay = free / daysLeft;
    return {
      text:
        perDay > 0
          ? `Você pode gastar cerca de **${money(perDay)} por dia** até o fim do mês (${daysLeft} dias), mantendo 20% da renda guardados e as contas previstas pagas.`
          : `Atenção: considerando as contas previstas e uma meta de guardar 20% da renda, **não há folga** para gastos extras este mês (faltam ${money(Math.abs(free))}). Priorize o essencial.`,
      facts: [
        { label: 'Renda esperada no mês', value: money(expectedIncome) },
        { label: 'Já gasto no mês', value: money(cur.expense) },
        { label: 'Contas ainda a pagar', value: money(pendingBills) },
        { label: 'Reserva sugerida (20%)', value: money(savingsTarget) },
      ],
      followUps: ['Quais contas vencem este mês?', 'Quanto gastei este mês?'],
    };
  }

  // --- Maior despesa
  if (/maior (despesa|gasto|compra)|gastei mais|mais caro/.test(q)) {
    if (!hasTx) return noData;
    const p = /mes|semana|hoje|ontem|ano|dias|meses|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/.test(q) ? period : { from: startOfMonth(ref), to: ref };
    const lbl = p === period ? label : 'neste mês';
    const top = data.transactions.filter((t) => t.type === 'expense' && inPeriod(t, p) && isRealized(t)).sort((a, b) => b.amount - a.amount);
    if (!top.length) return { text: `Não encontrei despesas ${lbl}.` };
    const cat = totalsByCategory(data.transactions, data.categories, p, 'expense')[0];
    return {
      text: `Sua maior despesa ${lbl} foi **${top[0].description}**, de **${money(top[0].amount)}** em ${formatDate(top[0].date)}. A categoria com maior gasto foi **${cat.category.name}** (${money(cat.total)}, ${formatPercent(cat.pct)} do total).`,
      facts: top.slice(1, 4).map((t) => ({ label: t.description, value: money(t.amount) })),
      links: [{ label: 'Ver análise de gastos', href: '/app/analises?aba=gastos' }],
    };
  }

  // --- Meta
  if (/meta|economizar para|juntar|guardar para/.test(q)) {
    if (!data.goals.length) return { text: 'Você ainda não criou metas. Crie uma e eu calculo quanto guardar por mês.', links: [{ label: 'Criar meta', href: '/app/metas' }] };
    const target = data.goals.find((g) => q.includes(norm(g.name))) ?? data.goals.map((g) => goalProgress(g)).filter((g) => !g.reached).sort((a, b) => b.pct - a.pct)[0]?.goal ?? data.goals[0];
    const g = goalProgress(target);
    if (g.reached) return { text: `Sua meta **${target.name}** já foi atingida: ${money(g.current)} de ${money(target.target)}. 🎉` };
    const parts = [`Para a meta **${target.name}** faltam **${money(g.remaining)}** (${formatPercent(g.pct, 0)} concluído).`];
    if (g.monthlyNeeded !== null && target.deadline) parts.push(`Para cumprir o prazo de ${formatDate(target.deadline)}, guarde **${money(g.monthlyNeeded)} por mês**.`);
    if (g.avgMonthly > 0 && g.monthsToGoal !== null) parts.push(`No seu ritmo atual (${money(g.avgMonthly)}/mês), você chega lá em aproximadamente **${g.monthsToGoal} meses**.`);
    else parts.push('Você ainda não fez aportes recentes nessa meta.');
    return {
      text: parts.join(' '),
      facts: data.goals.filter((x) => x.id !== target.id).map((x) => {
        const p = goalProgress(x);
        return { label: x.name, value: `${formatPercent(p.pct, 0)} · faltam ${money(p.remaining)}` };
      }),
      links: [{ label: 'Abrir metas', href: '/app/metas' }],
    };
  }

  // --- Como estão minhas finanças?
  if (/como (estao|esta|vao|vai)|saude|resumo|situacao|diagnostico|score/.test(q)) {
    if (!hasTx) return noData;
    const s = financialScore(data);
    const cur = summarize(data.transactions, { from: startOfMonth(ref), to: ref });
    const avg = monthlyAverages(data.transactions, 3);
    const nw = netWorth(data);
    const weakest = [...s.factors].sort((a, b) => a.value - b.value)[0];
    const strongest = [...s.factors].sort((a, b) => b.value - a.value)[0];
    return {
      text: `Sua saúde financeira está **${s.band.label.toLowerCase()}**: score **${s.score}/1000**. Ponto forte: ${strongest.label.toLowerCase()} — ${strongest.detail.charAt(0).toLowerCase()}${strongest.detail.slice(1)} Ponto de atenção: ${weakest.label.toLowerCase()} — ${weakest.tip.charAt(0).toLowerCase()}${weakest.tip.slice(1)}`,
      facts: [
        { label: 'Patrimônio líquido', value: money(nw.total) },
        { label: 'Saldo em contas', value: money(nw.cash) },
        { label: 'Média mensal (3m) — receitas', value: money(avg.income) },
        { label: 'Média mensal (3m) — despesas', value: money(avg.expense) },
        { label: 'Resultado do mês até hoje', value: money(cur.net) },
      ],
      links: [{ label: 'Ver saúde financeira', href: '/app/saude' }],
    };
  }

  // --- Orçamentos
  if (/orcamento|ultrapassar|estourar|limite/.test(q)) {
    const u = budgetUsage(data.budgets, data.categories, data.transactions);
    if (!u.length) return { text: 'Você ainda não definiu orçamentos.', links: [{ label: 'Criar orçamento', href: '/app/orcamentos' }] };
    const risky = u.filter((b) => b.level !== 'ok' || b.projected > b.budget.amount);
    return {
      text: risky.length
        ? `Sim — ${risky.length} orçamento(s) pedem atenção. ${risky.map((b) => `**${b.category?.name}**: ${formatPercent(b.pct, 0)} usado${b.projected > b.budget.amount ? ` (projeção de ${money(b.projected)} até o fim do mês)` : ''}`).join('; ')}.`
        : 'Todos os seus orçamentos estão dentro do limite e no ritmo certo. 👏',
      facts: u.map((b) => ({ label: b.category?.name ?? '—', value: `${money(b.spent)} de ${money(b.budget.amount)}` })),
      links: [{ label: 'Abrir orçamentos', href: '/app/orcamentos' }],
    };
  }

  // --- Faturas / contas a pagar
  if (/fatura|cartao|vence|vencimento|contas a pagar|pagar este mes|contas vencem/.test(q)) {
    if (/fatura|cartao/.test(q) && data.cards.length) {
      const facts = data.cards.map((c) => {
        const s = cardSummary(c, data.transactions);
        const inv = s.pending ?? s.current;
        return { label: c.name, value: inv ? `${money(inv.total - inv.paid)} · vence ${formatDate(inv.dueDate)}` : 'sem fatura' };
      });
      const next = data.cards.map((c) => cardSummary(c, data.transactions)).map((s) => s.pending ?? s.current).filter(Boolean).sort((a, b) => a!.dueDate.localeCompare(b!.dueDate))[0];
      return {
        text: next ? `Sua próxima fatura vence em **${formatDate(next.dueDate)}** (${diffDays(ref, next.dueDate)} dias), no valor de **${money(next.total - next.paid)}**.` : 'Não há faturas em aberto.',
        facts,
        links: [{ label: 'Ver cartões', href: '/app/cartoes' }],
      };
    }
    const evs = monthEvents(data, monthKey(ref)).filter((e) => !e.done && e.date >= ref && e.kind !== 'income' && e.kind !== 'goal');
    return {
      text: evs.length ? `Você tem **${evs.length} compromissos** até o fim do mês, somando **${money(evs.reduce((s, e) => s + (e.amount ?? 0), 0))}**.` : 'Nenhuma conta pendente até o fim do mês.',
      facts: evs.slice(0, 6).map((e) => ({ label: `${formatDate(e.date).slice(0, 5)} · ${e.title}`, value: money(e.amount ?? 0) })),
      links: [{ label: 'Abrir calendário', href: '/app/calendario' }],
    };
  }

  // --- Investimentos
  if (/invest|carteira|rentab|dividendo|acoes|fii/.test(q)) {
    if (!data.investments.length) return { text: 'Você ainda não registrou investimentos.', links: [{ label: 'Adicionar investimento', href: '/app/investimentos' }] };
    const p = portfolioSummary(data.investments);
    return {
      text: `Você tem **${money(p.current)}** investidos (aplicado: ${money(p.invested)}), com rentabilidade acumulada de **${formatPercent(p.returnPct, 1, true)}** e ${money(p.dividends)} em proventos. Informação educativa — não é recomendação de investimento.`,
      facts: p.allocation.map((a) => ({ label: a.label, value: `${money(a.value)} · ${formatPercent(a.pct)}` })),
      links: [{ label: 'Ver carteira', href: '/app/investimentos' }],
    };
  }

  // --- Dívidas
  if (/divida|emprestimo|devo|financiamento/.test(q)) {
    const t = debtTotals(data.debts);
    if (!t.count) return { text: 'Você não tem dívidas ativas registradas. 👏' };
    return {
      text: `Você deve **${money(t.remaining)}** em ${t.count} dívida(s), com parcelas somando **${money(t.monthly)}/mês**.`,
      facts: data.debts.filter((d) => d.status !== 'paid').map((d) => ({ label: d.name, value: `${money(d.remaining)} · ${formatPercent(d.interestRate)} a.m.` })),
      links: [{ label: 'Plano de quitação', href: '/app/dividas' }],
    };
  }

  // --- Assinaturas
  if (/assinatura|netflix|spotify|recorrente/.test(q)) {
    const s = subscriptionsSummary(data.subscriptions);
    if (!s.count) return { text: 'Você não tem assinaturas ativas registradas.' };
    return { text: `Você gasta **${money(s.monthly)}/mês** com ${s.count} assinaturas (${money(s.yearly)} por ano).`, facts: s.upcoming.map((u) => ({ label: `${u.sub.name} · ${formatDate(u.date)}`, value: money(u.sub.amount) })), links: [{ label: 'Ver assinaturas', href: '/app/assinaturas' }] };
  }

  // --- Saldo
  if (/saldo|quanto (eu )?tenho|dinheiro (eu )?tenho|patrimonio/.test(q)) {
    const nw = netWorth(data);
    const bal = accountBalances(data.accounts, data.transactions);
    return {
      text: `Seu saldo em contas é **${money(nw.cash)}**. Somando investimentos e descontando dívidas e faturas, seu patrimônio líquido é **${money(nw.total)}**.`,
      facts: data.accounts.filter((a) => !a.archived).map((a) => ({ label: a.name, value: money(bal.get(a.id) ?? 0) })),
      links: [{ label: 'Ver contas', href: '/app/contas' }],
    };
  }

  // --- Gasto por categoria
  const cat = data.categories.find((c) => c.kind === 'expense' && q.includes(norm(c.name)));
  if (cat && /gast|despes|paguei|quanto/.test(q)) {
    const t = totalsByCategory(data.transactions, data.categories, period, 'expense').find((x) => x.category.id === cat.id);
    return {
      text: t ? `Você gastou **${money(t.total)}** com ${cat.name.toLowerCase()} ${label} (${t.count} lançamentos, ${formatPercent(t.pct)} das despesas).` : `Não encontrei gastos com ${cat.name.toLowerCase()} ${label}.`,
      links: [{ label: `Ver ${cat.name}`, href: `/app/transacoes?categoria=${cat.id}` }],
    };
  }

  // --- Lucro / prejuízo / economia
  if (/lucro|prejuizo|sobrou|economizei|resultado/.test(q)) {
    if (!hasTx) return noData;
    const s = summarize(data.transactions, period);
    return {
      text: s.net >= 0 ? `Você teve **lucro de ${money(s.net)}** ${label}: receitas de ${money(s.income)} menos despesas de ${money(s.expense)} (${formatPercent(s.savingsRate, 0)} da renda guardada).` : `Você teve **prejuízo de ${money(Math.abs(s.net))}** ${label}: as despesas (${money(s.expense)}) superaram as receitas (${money(s.income)}).`,
    };
  }

  // --- Quanto ganhei
  if (/ganhei|recebi|receita|entrou|renda/.test(q)) {
    if (!hasTx) return noData;
    const s = summarize(data.transactions, period);
    const cats = totalsByCategory(data.transactions, data.categories, period, 'income');
    return { text: `Você recebeu **${money(s.income)}** ${label} em ${s.incomeCount} lançamento(s).`, facts: cats.map((c) => ({ label: c.category.name, value: money(c.total) })) };
  }

  // --- Quanto gastei
  if (/gastei|gasto|despesa|saiu|paguei/.test(q)) {
    if (!hasTx) return noData;
    const s = summarize(data.transactions, period);
    const len = diffDays(period.from, period.to) + 1;
    const prev = summarize(data.transactions, { from: addDays(period.from, -len), to: addDays(period.from, -1) });
    const change = pctChange(s.expense, prev.expense);
    const cats = totalsByCategory(data.transactions, data.categories, period, 'expense');
    return {
      text: `Você gastou **${money(s.expense)}** ${label} em ${s.expenseCount} despesa(s).${change !== null && prev.expense ? ` Isso é ${formatPercent(Math.abs(change), 0)} ${change >= 0 ? 'a mais' : 'a menos'} que no período anterior equivalente.` : ''}`,
      facts: cats.slice(0, 5).map((c) => ({ label: c.category.name, value: `${money(c.total)} · ${formatPercent(c.pct, 0)}` })),
      links: [{ label: 'Ver detalhamento', href: '/app/analises?aba=gastos' }],
      followUps: ['Qual foi minha maior despesa?', 'Quanto posso gastar hoje?'],
    };
  }

  return {
    text: 'Ainda não sei responder isso com segurança. Posso ajudar com gastos, receitas, saldo, metas, orçamentos, faturas, investimentos, dívidas e assinaturas — sempre com base nos seus dados.',
    followUps: SUGGESTIONS.slice(0, 4),
  };
}
