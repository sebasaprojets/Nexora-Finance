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
import { addDays, addMonths, daysInMonth, diffDays, endOfMonth, formatDate, formatDayMonth, monthKey, monthName, startOfMonth, startOfWeek, today } from './dates';
import { currentLang, t } from '@/i18n';
import { formatMoney, formatPercent, parseMoneyInput, pctChange } from './format';
import { suggestCategory } from './categorize';

/**
 * Nexora AI — assistente financeiro.
 *
 * Motor determinístico de intenções que responde SOMENTE com números calculados
 * a partir dos dados do usuário (nunca inventa valores). Para respostas em
 * linguagem livre com um LLM, envie a pergunta + o resumo `buildContext()` a um
 * endpoint do backend (a chave da API fica no servidor, nunca no frontend).
 */

/** Lançamento interpretado de uma frase ("gastei 35 no mercado"), aguardando confirmação. */
export interface QuickEntryDraft {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  date: string;
}

export interface AssistantAnswer {
  text: string;
  draft?: QuickEntryDraft;
  facts?: { label: string; value: string }[];
  links?: { label: string; href: string }[];
  followUps?: string[];
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Meses reconhecidos nas perguntas (PT / EN / ES, sem acentos).
 * `may` exige um contexto de data ("in may", "may 2026") para não confundir com o verbo.
 */
const MONTH_PATTERNS: RegExp[] = [
  /\b(janeiro|january|jan|enero)\b/,
  /\b(fevereiro|february|feb|febrero)\b/,
  /\b(marco|march|marzo)\b/,
  /\b(abril|april)\b/,
  /\b(maio|in may|of may|may \d{4}|mayo)\b/,
  /\b(junho|june|junio)\b/,
  /\b(julho|july|julio)\b/,
  /\b(agosto|august)\b/,
  /\b(setembro|september|septiembre|setiembre)\b/,
  /\b(outubro|october|octubre)\b/,
  /\b(novembro|november|noviembre)\b/,
  /\b(dezembro|december|diciembre)\b/,
];

export function parsePeriod(q: string, ref = today()): { period: Period; label: string } {
  if (/\b(hoje|today|hoy)\b/.test(q)) return { period: { from: ref, to: ref }, label: t('hoje') };
  if (/\b(ontem|yesterday|ayer)\b/.test(q)) return { period: { from: addDays(ref, -1), to: addDays(ref, -1) }, label: t('ontem') };
  if (/semana passada|last week|previous week|semana pasada/.test(q)) {
    const s = addDays(startOfWeek(ref), -7);
    return { period: { from: s, to: addDays(s, 6) }, label: t('na semana passada') };
  }
  if (/(esta|essa|nesta|nessa) semana|semana|\bweek\b/.test(q)) return { period: { from: startOfWeek(ref), to: ref }, label: t('nesta semana') };
  if (/mes passado|ultimo mes|last month|previous month|mes pasado/.test(q)) {
    const s = startOfMonth(addMonths(ref, -1));
    return { period: { from: s, to: endOfMonth(s) }, label: t('no mês passado') };
  }
  if (/ultimos? 30 dias|(last|past) 30 days/.test(q)) return { period: { from: addDays(ref, -29), to: ref }, label: t('nos últimos 30 dias') };
  if (/ultimos? (3|tres) meses|(last|past) (3|three) months/.test(q)) return { period: { from: startOfMonth(addMonths(ref, -2)), to: ref }, label: t('nos últimos 3 meses') };
  if (/(este|esse|neste|nesse) ano|no ano|this year|en el ano/.test(q)) return { period: { from: `${ref.slice(0, 4)}-01-01`, to: ref }, label: t('neste ano') };
  const mi = MONTH_PATTERNS.findIndex((re) => re.test(q));
  if (mi >= 0) {
    let y = Number(ref.slice(0, 4));
    if (mi + 1 > Number(ref.slice(5, 7))) y -= 1;
    const key = `${y}-${String(mi + 1).padStart(2, '0')}`;
    const s = `${key}-01`;
    const name = monthName(key);
    return { period: { from: s, to: endOfMonth(s) < ref ? endOfMonth(s) : ref }, label: t('em {mes}', { mes: currentLang() === 'en' ? name : name.toLowerCase() }) };
  }
  return { period: { from: startOfMonth(ref), to: ref }, label: t('neste mês') };
}

const FILLER = new Set([
  // PT
  'no', 'na', 'nos', 'nas', 'em', 'de', 'do', 'da', 'com', 'pelo', 'pela', 'por', 'pra', 'para', 'o', 'a', 'os', 'as', 'um', 'uma', 'reais', 'real', 'conto', 'contos', 'hoje', 'ontem', 'anteontem', 'r', 'eu', 'agora', 'cartao', 'credito', 'debito', 'pix', 'dinheiro', 'conta', 'no cartao',
  // EN
  'at', 'on', 'in', 'for', 'the', 'an', 'from', 'of', 'to', 'with', 'my', 'i', 'me', 'by', 'via', 'using', 'dollars', 'dollar', 'bucks', 'usd', 'today', 'yesterday', 'now', 'card', 'credit', 'debit', 'cash', 'account',
  // ES
  'en', 'el', 'la', 'los', 'las', 'del', 'al', 'y', 'con', 'mi', 'yo', 'pesos', 'euros', 'dolares', 'hoy', 'ayer', 'anteayer', 'ahora', 'tarjeta', 'efectivo', 'cuenta',
]);
const EXPENSE_VERBS = /\b(gastei|paguei|comprei|torrei|gasto de|despesa de|saiu|spent|paid|bought|paid for|expense of|gaste|pague|compre)\b/;
const INCOME_VERBS = /\b(recebi|ganhei|entrou|caiu|receita de|got paid|was paid|get paid|received|got|earned|made|income of|recibi|gane|cobre|me pagaron|me depositaron|entro|ingreso de)\b/;
const PAID_AS_INCOME = /\b(got|was|get) paid\b|\bme pagaron\b/;
const QUESTION_START = /^(quanto|quanta|qual|quais|como|quando|onde|por que|porque|how|what|which|when|where|why|do|does|did|can|could|should|is|are|am|cuanto|cuanta|cual|cuales|cuando|donde|que)\b/;
const MONEY = /(?:r\$|us\$|\$|€)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i;

/**
 * Interpreta frases como "gastei 35,90 no mercado ontem no Nubank", "recebi 5000 de salário",
 * "spent 35 at the grocery store", "got 5000 salary", "gasté 35 en el súper" ou "recibí 5000 de sueldo".
 */
export function parseQuickEntry(question: string, data: FinanceData, ref = today()): QuickEntryDraft | null {
  const raw = question.trim().replace(/^[¿¡\s]+/, '');
  const q = norm(raw);
  if (raw.includes('?') || QUESTION_START.test(q)) return null;
  const paidAsIncome = PAID_AS_INCOME.test(q);
  const isExpense = !paidAsIncome && EXPENSE_VERBS.test(q);
  const isIncome = !isExpense && INCOME_VERBS.test(q);
  const m = raw.match(MONEY);
  if (!m) return null;
  // Sem verbo, aceita frases curtas do tipo "uber 23,50".
  const words = q.split(' ').filter(Boolean);
  if (!isExpense && !isIncome && words.length > 4) return null;
  // "1,250.50" (formato americano) → remove a vírgula de milhar.
  const amount = parseMoneyInput(/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(m[1]) ? m[1].replace(/,/g, '') : m[1]);
  if (!(amount > 0)) return null;
  const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

  const date = /\b(anteontem|anteayer|antier)\b|day before yesterday/.test(q) ? addDays(ref, -2) : /\b(ontem|yesterday|ayer)\b/.test(q) ? addDays(ref, -1) : ref;

  // Conta ou cartão citado pelo nome/instituição; "cartão/crédito" → primeiro cartão.
  const accounts = data.accounts.filter((a) => !a.archived);
  let cardId: string | undefined;
  let accountId: string | undefined;
  const mentioned = (name: string) => name.length > 2 && q.includes(norm(name));
  const CARD_WORDS = /\b(cartao|credito|card|credit|tarjeta)\b/;
  if (type === 'expense') {
    const card = data.cards.find((c) => mentioned(c.name) || mentioned(c.institution) && CARD_WORDS.test(q));
    if (card) cardId = card.id;
    else if (CARD_WORDS.test(q) && data.cards[0]) cardId = data.cards[0].id;
  }
  if (!cardId) accountId = (accounts.find((a) => mentioned(a.name) || mentioned(a.institution)) ?? accounts.find((a) => a.type === 'checking' || a.type === 'digital') ?? accounts[0])?.id;

  // Descrição: o que sobra sem verbo, valor, datas e palavras de ligação.
  const stripNames = [...data.accounts.flatMap((a) => [a.name, a.institution]), ...data.cards.flatMap((c) => [c.name, c.institution])].map(norm).filter((n) => n.length > 2);
  let rest = norm(raw.replace(m[0], ' '));
  rest = rest
    .replace(/day before yesterday/g, ' ')
    .replace(new RegExp(PAID_AS_INCOME.source, 'g'), ' ')
    .replace(new RegExp(EXPENSE_VERBS.source, 'g'), ' ')
    .replace(new RegExp(INCOME_VERBS.source, 'g'), ' ');
  for (const n of stripNames) rest = rest.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ');
  const descWords = rest.split(' ').filter((w) => w && !FILLER.has(w) && !/^\d+$/.test(w));
  const kind = type === 'income' ? 'income' : 'expense';
  let description = descWords.join(' ');
  const cat = suggestCategory(description || raw, kind, data.categories, data.transactions);
  if (!description) description = cat ? t(cat.name) : type === 'income' ? t('Receita') : t('Despesa');
  description = description.charAt(0).toUpperCase() + description.slice(1);
  const fallback = data.categories.find((c) => c.kind === kind && /^outros$/i.test(c.name));
  return { type, amount, description, categoryId: (cat ?? fallback)?.id, accountId, cardId, date };
}

const SUGGESTION_KEYS = [
  'Quanto gastei este mês?',
  'Quanto posso gastar hoje?',
  'Qual foi minha maior despesa?',
  'Como estão minhas finanças?',
  'Quanto preciso economizar para atingir minha meta?',
  'Estou perto de ultrapassar algum orçamento?',
  'Quando vence minha fatura?',
  'Quanto tenho investido?',
  'Gastei 35,90 no mercado',
];

/** Sugestões de perguntas no idioma atual. */
export function suggestions(): string[] {
  return SUGGESTION_KEYS.map((s) => t(s));
}

/**
 * Quanto dá para gastar por dia até o fim do mês, mantendo 20% da renda guardados
 * e as contas previstas pagas (usado no Início e na Nexora AI).
 */
export function spendingAllowance(data: FinanceData, ref = today()) {
  const month = monthKey(ref);
  const cur = summarize(data.transactions, { from: startOfMonth(ref), to: ref });
  const avg = monthlyAverages(data.transactions, 3);
  const events = monthEvents(data, month);
  const pendingIncome = events.filter((e) => e.kind === 'income' && !e.done && e.date > ref).reduce((s, e) => s + (e.amount ?? 0), 0);
  const expectedIncome = Math.max(cur.income + pendingIncome, avg.income);
  const pendingBills = events
    .filter((e) => !e.done && e.date >= ref && ['bill', 'invoice', 'debt', 'subscription'].includes(e.kind) && !(e.kind === 'subscription' && data.subscriptions.find((x) => x.id === e.refId)?.cardId))
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const savingsTarget = expectedIncome * 0.2;
  const daysLeft = daysInMonth(Number(month.slice(0, 4)), Number(month.slice(5))) - Number(ref.slice(8)) + 1;
  const free = expectedIncome - cur.expense - pendingBills - savingsTarget;
  return { perDay: free / daysLeft, free, daysLeft, expectedIncome, spent: cur.expense, income: cur.income, pendingBills, savingsTarget };
}

export function answer(question: string, data: FinanceData, money: (v: number) => string = (v) => formatMoney(v)): AssistantAnswer {
  const q = norm(question);
  const ref = today();
  const { period, label } = parsePeriod(q, ref);
  const hasTx = data.transactions.length > 0;
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  // --- Lançamento por conversa ("gastei 35 no mercado")
  const draft = parseQuickEntry(question, data, ref);
  if (draft) {
    if (!data.accounts.length) return { text: t('Para registrar lançamentos, primeiro cadastre uma conta (banco ou carteira).'), links: [{ label: t('Cadastrar conta'), href: '/app/contas?nova=1' }] };
    const cat = data.categories.find((c) => c.id === draft.categoryId);
    const src = draft.cardId ? data.cards.find((c) => c.id === draft.cardId)?.name : data.accounts.find((a) => a.id === draft.accountId)?.name;
    return {
      text: draft.type === 'income' ? t('Entendi! Posso registrar esta **receita** para você:') : t('Entendi! Posso registrar esta **despesa** para você:'),
      draft,
      facts: [
        { label: t('Valor'), value: money(draft.amount) },
        { label: t('Descrição'), value: draft.description },
        { label: t('Categoria'), value: cat ? t(cat.name) : '—' },
        { label: draft.cardId ? t('Cartão') : t('Conta'), value: src ?? '—' },
        { label: t('Data'), value: draft.date === ref ? t('Hoje') : formatDate(draft.date) },
      ],
    };
  }

  const noData: AssistantAnswer = {
    text: t('Ainda não há transações registradas, então não consigo calcular isso sem inventar números. Registre suas receitas e despesas e pergunte de novo.'),
    links: [{ label: t('Adicionar transação'), href: '/app/transacoes?nova=expense' }],
  };

  // --- Quanto posso gastar hoje?
  if (/posso gastar|disponivel para gastar|limite diario|gastar por dia|can i (still )?spend|available to spend|safe to spend|daily (limit|budget)|spend per day|puedo gastar|disponible para gastar|gastar (por|al) dia/.test(q)) {
    if (!hasTx) return noData;
    const { perDay, free, daysLeft, expectedIncome, spent, pendingBills, savingsTarget } = spendingAllowance(data, ref);
    const cur = { expense: spent };
    return {
      text:
        perDay > 0
          ? t('Você pode gastar cerca de **{valor} por dia** até o fim do mês ({dias} dias), mantendo 20% da renda guardados e as contas previstas pagas.', { valor: money(perDay), dias: daysLeft })
          : t('Atenção: considerando as contas previstas e uma meta de guardar 20% da renda, **não há folga** para gastos extras este mês (faltam {valor}). Priorize o essencial.', { valor: money(Math.abs(free)) }),
      facts: [
        { label: t('Renda esperada no mês'), value: money(expectedIncome) },
        { label: t('Já gasto no mês'), value: money(cur.expense) },
        { label: t('Contas ainda a pagar'), value: money(pendingBills) },
        { label: t('Reserva sugerida (20%)'), value: money(savingsTarget) },
      ],
      followUps: [t('Quais contas vencem este mês?'), t('Quanto gastei este mês?')],
    };
  }

  // --- Maior despesa
  if (/maior (despesa|gasto|compra)|gastei mais|mais caro|(biggest|largest|highest|top) (expense|purchase|spend)|spent the most|most expensive|mayor (gasto|compra)|gaste mas|mas caro/.test(q)) {
    if (!hasTx) return noData;
    const top = data.transactions.filter((x) => x.type === 'expense' && inPeriod(x, period) && isRealized(x)).sort((a, b) => b.amount - a.amount);
    if (!top.length) return { text: t('Não encontrei despesas {periodo}.', { periodo: label }) };
    const cat = totalsByCategory(data.transactions, data.categories, period, 'expense')[0];
    return {
      text: t('Sua maior despesa {periodo} foi **{descricao}**, de **{valor}** em {data}. A categoria com maior gasto foi **{categoria}** ({total}, {pct} do total).', {
        periodo: label,
        descricao: top[0].description,
        valor: money(top[0].amount),
        data: formatDate(top[0].date),
        categoria: t(cat.category.name),
        total: money(cat.total),
        pct: formatPercent(cat.pct),
      }),
      facts: top.slice(1, 4).map((x) => ({ label: x.description, value: money(x.amount) })),
      links: [{ label: t('Ver análise de gastos'), href: '/app/analises?aba=gastos' }],
    };
  }

  // --- Meta
  if (/meta|economizar para|juntar|guardar para|\bgoals?\b|save (up )?for|saving (up )?for|ahorrar para|juntar para/.test(q)) {
    if (!data.goals.length) return { text: t('Você ainda não criou metas. Crie uma e eu calculo quanto guardar por mês.'), links: [{ label: t('Criar meta'), href: '/app/metas' }] };
    const target = data.goals.find((g) => q.includes(norm(g.name))) ?? data.goals.map((g) => goalProgress(g)).filter((g) => !g.reached).sort((a, b) => b.pct - a.pct)[0]?.goal ?? data.goals[0];
    const g = goalProgress(target);
    if (g.reached) return { text: t('Sua meta **{meta}** já foi atingida: {atual} de {alvo}. 🎉', { meta: target.name, atual: money(g.current), alvo: money(target.target) }) };
    const parts = [t('Para a meta **{meta}** faltam **{valor}** ({pct} concluído).', { meta: target.name, valor: money(g.remaining), pct: formatPercent(g.pct, 0) })];
    if (g.monthlyNeeded !== null && target.deadline) parts.push(t('Para cumprir o prazo de {data}, guarde **{valor} por mês**.', { data: formatDate(target.deadline), valor: money(g.monthlyNeeded) }));
    if (g.avgMonthly > 0 && g.monthsToGoal !== null)
      parts.push(
        g.monthsToGoal === 1
          ? t('No seu ritmo atual ({valor}/mês), você chega lá em aproximadamente **{n} mês**.', { valor: money(g.avgMonthly), n: g.monthsToGoal })
          : t('No seu ritmo atual ({valor}/mês), você chega lá em aproximadamente **{n} meses**.', { valor: money(g.avgMonthly), n: g.monthsToGoal }),
      );
    else parts.push(t('Você ainda não fez aportes recentes nessa meta.'));
    return {
      text: parts.join(' '),
      facts: data.goals.filter((x) => x.id !== target.id).map((x) => {
        const p = goalProgress(x);
        return { label: x.name, value: t('{pct} · faltam {valor}', { pct: formatPercent(p.pct, 0), valor: money(p.remaining) }) };
      }),
      links: [{ label: t('Abrir metas'), href: '/app/metas' }],
    };
  }

  // --- Como estão minhas finanças?
  if (/como (estao|esta|vao|vai|estan|van)|saude|resumo|situacao|diagnostico|score|how (are|is|am)|how'?s my|health|overview|summary|situation|diagnos|salud|resumen(?! de (la |mi )?tarjeta)|situacion/.test(q)) {
    if (!hasTx) return noData;
    const s = financialScore(data);
    const cur = summarize(data.transactions, { from: startOfMonth(ref), to: ref });
    const avg = monthlyAverages(data.transactions, 3);
    const nw = netWorth(data);
    const weakest = [...s.factors].sort((a, b) => a.value - b.value)[0];
    const strongest = [...s.factors].sort((a, b) => b.value - a.value)[0];
    return {
      text: t('Sua saúde financeira está **{faixa}**: score **{score}/1000**. Ponto forte: {forte} — {forteDetalhe} Ponto de atenção: {fraco} — {fracoDica}', {
        faixa: s.band.label.toLowerCase(),
        score: s.score,
        forte: strongest.label.toLowerCase(),
        forteDetalhe: lower(strongest.detail),
        fraco: weakest.label.toLowerCase(),
        fracoDica: lower(weakest.tip),
      }),
      facts: [
        { label: t('Patrimônio líquido'), value: money(nw.total) },
        { label: t('Saldo em contas'), value: money(nw.cash) },
        { label: t('Média mensal (3m) — receitas'), value: money(avg.income) },
        { label: t('Média mensal (3m) — despesas'), value: money(avg.expense) },
        { label: t('Resultado do mês até hoje'), value: money(cur.net) },
      ],
      links: [{ label: t('Ver saúde financeira'), href: '/app/saude' }],
    };
  }

  // --- Orçamentos
  if (/orcamento|ultrapassar|estourar|limite|budget|overspend|\bexceed|go(ing)? over|\blimit\b|presupuesto|pasarme|exceder|sobrepasar/.test(q)) {
    const u = budgetUsage(data.budgets, data.categories, data.transactions);
    if (!u.length) return { text: t('Você ainda não definiu orçamentos.'), links: [{ label: t('Criar orçamento'), href: '/app/orcamentos' }] };
    const risky = u.filter((b) => b.level !== 'ok' || b.projected > b.budget.amount);
    const item = (b: (typeof u)[number]) => {
      const name = b.category ? t(b.category.name) : '—';
      return b.projected > b.budget.amount
        ? t('**{categoria}**: {pct} usado (projeção de {valor} até o fim do mês)', { categoria: name, pct: formatPercent(b.pct, 0), valor: money(b.projected) })
        : t('**{categoria}**: {pct} usado', { categoria: name, pct: formatPercent(b.pct, 0) });
    };
    return {
      text: risky.length
        ? `${risky.length === 1 ? t('Sim — 1 orçamento pede atenção.') : t('Sim — {n} orçamentos pedem atenção.', { n: risky.length })} ${risky.map(item).join('; ')}.`
        : t('Todos os seus orçamentos estão dentro do limite e no ritmo certo. 👏'),
      facts: u.map((b) => ({ label: b.category ? t(b.category.name) : '—', value: t('{gasto} de {total}', { gasto: money(b.spent), total: money(b.budget.amount) }) })),
      links: [{ label: t('Abrir orçamentos'), href: '/app/orcamentos' }],
    };
  }

  // --- Faturas / contas a pagar
  const cardQuestion = /fatura|cartao|\bcards?\b|statement|tarjeta|resumen/.test(q);
  if (cardQuestion || /vence|vencimento|contas a pagar|pagar este mes|contas vencem|\bdue\b|\bbills?\b|to pay|pay this month|cuentas por pagar|vencimiento|pagar este mes/.test(q)) {
    if (cardQuestion && data.cards.length) {
      const facts = data.cards.map((c) => {
        const s = cardSummary(c, data.transactions);
        const inv = s.pending ?? s.current;
        return { label: c.name, value: inv ? t('{valor} · vence {data}', { valor: money(inv.total - inv.paid), data: formatDate(inv.dueDate) }) : t('sem fatura') };
      });
      const next = data.cards.map((c) => cardSummary(c, data.transactions)).map((s) => s.pending ?? s.current).filter(Boolean).sort((a, b) => a!.dueDate.localeCompare(b!.dueDate))[0];
      return {
        text: next
          ? t('Sua próxima fatura vence em **{data}** ({dias} dias), no valor de **{valor}**.', { data: formatDate(next.dueDate), dias: diffDays(ref, next.dueDate), valor: money(next.total - next.paid) })
          : t('Não há faturas em aberto.'),
        facts,
        links: [{ label: t('Ver cartões'), href: '/app/cartoes' }],
      };
    }
    const evs = monthEvents(data, monthKey(ref)).filter((e) => !e.done && e.date >= ref && e.kind !== 'income' && e.kind !== 'goal');
    const total = money(evs.reduce((s, e) => s + (e.amount ?? 0), 0));
    return {
      text: evs.length
        ? evs.length === 1
          ? t('Você tem **1 compromisso** até o fim do mês, somando **{valor}**.', { valor: total })
          : t('Você tem **{n} compromissos** até o fim do mês, somando **{valor}**.', { n: evs.length, valor: total })
        : t('Nenhuma conta pendente até o fim do mês.'),
      facts: evs.slice(0, 6).map((e) => ({ label: `${formatDayMonth(e.date)} · ${e.title}`, value: money(e.amount ?? 0) })),
      links: [{ label: t('Abrir calendário'), href: '/app/calendario' }],
    };
  }

  // --- Investimentos
  if (/invest|carteira|rentab|dividend|acoes|fii|portfolio|\breturns?\b|stocks|inver|cartera|acciones/.test(q)) {
    if (!data.investments.length) return { text: t('Você ainda não registrou investimentos.'), links: [{ label: t('Adicionar investimento'), href: '/app/investimentos' }] };
    const p = portfolioSummary(data.investments);
    return {
      text: t('Você tem **{atual}** investidos (aplicado: {aplicado}), com rentabilidade acumulada de **{rent}** e {proventos} em proventos. Informação educativa — não é recomendação de investimento.', {
        atual: money(p.current),
        aplicado: money(p.invested),
        rent: formatPercent(p.returnPct, 1, true),
        proventos: money(p.dividends),
      }),
      facts: p.allocation.map((a) => ({ label: a.label, value: `${money(a.value)} · ${formatPercent(a.pct)}` })),
      links: [{ label: t('Ver carteira'), href: '/app/investimentos' }],
    };
  }

  // --- Dívidas
  if (/divida|emprestimo|devo|financiamento|\bdebts?\b|\bloans?\b|\bowe\b|mortgage|financing|deuda|prestamo|\bdebo\b/.test(q)) {
    const totals = debtTotals(data.debts);
    if (!totals.count) return { text: t('Você não tem dívidas ativas registradas. 👏') };
    return {
      text:
        totals.count === 1
          ? t('Você deve **{valor}** em 1 dívida, com parcelas somando **{mensal}/mês**.', { valor: money(totals.remaining), mensal: money(totals.monthly) })
          : t('Você deve **{valor}** em {n} dívidas, com parcelas somando **{mensal}/mês**.', { valor: money(totals.remaining), n: totals.count, mensal: money(totals.monthly) }),
      facts: data.debts.filter((d) => d.status !== 'paid').map((d) => ({ label: d.name, value: t('{valor} · {taxa} a.m.', { valor: money(d.remaining), taxa: formatPercent(d.interestRate) }) })),
      links: [{ label: t('Plano de quitação'), href: '/app/dividas' }],
    };
  }

  // --- Assinaturas
  if (/assinatura|netflix|spotify|recorrente|subscription|recurring|suscripcion/.test(q)) {
    const s = subscriptionsSummary(data.subscriptions);
    if (!s.count) return { text: t('Você não tem assinaturas ativas registradas.') };
    return {
      text:
        s.count === 1
          ? t('Você gasta **{mensal}/mês** com 1 assinatura ({anual} por ano).', { mensal: money(s.monthly), anual: money(s.yearly) })
          : t('Você gasta **{mensal}/mês** com {n} assinaturas ({anual} por ano).', { mensal: money(s.monthly), n: s.count, anual: money(s.yearly) }),
      facts: s.upcoming.map((u) => ({ label: `${u.sub.name} · ${formatDate(u.date)}`, value: money(u.sub.amount) })),
      links: [{ label: t('Ver assinaturas'), href: '/app/assinaturas' }],
    };
  }

  // --- Saldo
  if (/saldo|quanto (eu )?tenho|dinheiro (eu )?tenho|patrimonio|balance|how much (money )?(do )?i have|net worth|cuanto (dinero )?tengo|dinero tengo/.test(q)) {
    const nw = netWorth(data);
    const bal = accountBalances(data.accounts, data.transactions);
    return {
      text: t('Seu saldo em contas é **{saldo}**. Somando investimentos e descontando dívidas e faturas, seu patrimônio líquido é **{patrimonio}**.', { saldo: money(nw.cash), patrimonio: money(nw.total) }),
      facts: data.accounts.filter((a) => !a.archived).map((a) => ({ label: a.name, value: money(bal.get(a.id) ?? 0) })),
      links: [{ label: t('Ver contas'), href: '/app/contas' }],
    };
  }

  // --- Gasto por categoria (nome original ou traduzido)
  const cat = data.categories.find((c) => c.kind === 'expense' && (q.includes(norm(c.name)) || q.includes(norm(t(c.name)))));
  if (cat && /gast|despes|paguei|quanto|spen|paid|how much|expense|cuanto|pague/.test(q)) {
    const tot = totalsByCategory(data.transactions, data.categories, period, 'expense').find((x) => x.category.id === cat.id);
    const name = t(cat.name);
    return {
      text: tot
        ? tot.count === 1
          ? t('Você gastou **{valor}** com {categoria} {periodo} (1 lançamento, {pct} das despesas).', { valor: money(tot.total), categoria: name.toLowerCase(), periodo: label, pct: formatPercent(tot.pct) })
          : t('Você gastou **{valor}** com {categoria} {periodo} ({n} lançamentos, {pct} das despesas).', { valor: money(tot.total), categoria: name.toLowerCase(), periodo: label, n: tot.count, pct: formatPercent(tot.pct) })
        : t('Não encontrei gastos com {categoria} {periodo}.', { categoria: name.toLowerCase(), periodo: label }),
      links: [{ label: t('Ver {categoria}', { categoria: name }), href: `/app/transacoes?categoria=${cat.id}` }],
    };
  }

  // --- Lucro / prejuízo / economia
  if (/lucro|prejuizo|sobrou|economizei|resultado|profit|\bloss\b|left over|\bsaved?\b|\bnet\b|ganancia|perdida|sobro|ahorre/.test(q)) {
    if (!hasTx) return noData;
    const s = summarize(data.transactions, period);
    return {
      text:
        s.net >= 0
          ? t('Você teve **lucro de {valor}** {periodo}: receitas de {receitas} menos despesas de {despesas} ({pct} da renda guardada).', { valor: money(s.net), periodo: label, receitas: money(s.income), despesas: money(s.expense), pct: formatPercent(s.savingsRate, 0) })
          : t('Você teve **prejuízo de {valor}** {periodo}: as despesas ({despesas}) superaram as receitas ({receitas}).', { valor: money(Math.abs(s.net)), periodo: label, despesas: money(s.expense), receitas: money(s.income) }),
    };
  }

  // --- Quanto ganhei
  if (/ganhei|recebi|receita|entrou|renda|\bearn|received|income|\bmade\b|gane|recibi|ingreso|entro|cobre/.test(q)) {
    if (!hasTx) return noData;
    const s = summarize(data.transactions, period);
    const cats = totalsByCategory(data.transactions, data.categories, period, 'income');
    return {
      text:
        s.incomeCount === 1
          ? t('Você recebeu **{valor}** {periodo} em 1 lançamento.', { valor: money(s.income), periodo: label })
          : t('Você recebeu **{valor}** {periodo} em {n} lançamentos.', { valor: money(s.income), periodo: label, n: s.incomeCount }),
      facts: cats.map((c) => ({ label: t(c.category.name), value: money(c.total) })),
    };
  }

  // --- Quanto gastei
  if (/gastei|gasto|despesa|saiu|paguei|spen|expense|\bpaid\b|gaste|pague/.test(q)) {
    if (!hasTx) return noData;
    const s = summarize(data.transactions, period);
    const len = diffDays(period.from, period.to) + 1;
    const prev = summarize(data.transactions, { from: addDays(period.from, -len), to: addDays(period.from, -1) });
    const change = pctChange(s.expense, prev.expense);
    const cats = totalsByCategory(data.transactions, data.categories, period, 'expense');
    const main =
      s.expenseCount === 1
        ? t('Você gastou **{valor}** {periodo} em 1 despesa.', { valor: money(s.expense), periodo: label })
        : t('Você gastou **{valor}** {periodo} em {n} despesas.', { valor: money(s.expense), periodo: label, n: s.expenseCount });
    const cmp =
      change !== null && prev.expense
        ? ` ${
            change >= 0
              ? t('Isso é {pct} a mais que no período anterior equivalente.', { pct: formatPercent(Math.abs(change), 0) })
              : t('Isso é {pct} a menos que no período anterior equivalente.', { pct: formatPercent(Math.abs(change), 0) })
          }`
        : '';
    return {
      text: main + cmp,
      facts: cats.slice(0, 5).map((c) => ({ label: t(c.category.name), value: `${money(c.total)} · ${formatPercent(c.pct, 0)}` })),
      links: [{ label: t('Ver detalhamento'), href: '/app/analises?aba=gastos' }],
      followUps: [t('Qual foi minha maior despesa?'), t('Quanto posso gastar hoje?')],
    };
  }

  return {
    text: t('Ainda não sei responder isso com segurança. Posso ajudar com gastos, receitas, saldo, metas, orçamentos, faturas, investimentos, dívidas e assinaturas — sempre com base nos seus dados.'),
    followUps: suggestions().slice(0, 4),
  };
}
