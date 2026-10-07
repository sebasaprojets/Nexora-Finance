import { create } from 'zustand';
import type {
  AppNotification,
  DeviceSession,
  FinanceData,
  OnboardingProfile,
  Transaction,
} from '@/types';
import { createDemoData, createEmptyData } from '@/data/mock';
import { addMonths, today } from '@/lib/dates';
import { round2 } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeTags, sanitizeText } from '@/lib/sanitize';
import { describeDevice } from '@/lib/device';
import { readJSON, removeKey, writeJSON } from '@/services/storage';
import { authService } from '@/services/auth';
import { cloudEnabled, pullWorkspace, pushWorkspace, useSyncStatus } from '@/services/cloud';
import { t } from '@/i18n';

/**
 * Store do "workspace" do usuário: dados financeiros + notificações + sessões.
 * Persistido por usuário (`nexora:ws:<userId>`). Para usar backend, troque
 * `load`/`save` por chamadas à API e mantenha as ações.
 */

export interface Workspace extends FinanceData {
  notifications: AppNotification[];
  sessions: DeviceSession[];
  onboarding?: OnboardingProfile;
  version: number;
  /** Última alteração (para decidir entre a cópia local e a da nuvem). */
  updatedAt?: string;
}

type CollectionKey = Exclude<keyof FinanceData, never>;
type Item<K extends CollectionKey> = FinanceData[K][number];

const WS_VERSION = 1;

function initialSessions(): DeviceSession[] {
  const d = describeDevice();
  const now = new Date();
  return [
    { id: 'ses_current', device: d.device, browser: d.browser, os: d.os, location: t('Localização aproximada indisponível'), ip: '—', lastActive: now.toISOString(), current: true },
  ];
}

function demoExtras(): Pick<Workspace, 'notifications' | 'sessions'> {
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  return {
    sessions: [
      ...initialSessions(),
      { id: 'ses_phone', device: t('Celular'), browser: 'Safari', os: 'iOS', location: 'São Paulo, SP', ip: '177.38.xxx.xxx', lastActive: iso(3 * 3600_000), current: false },
      { id: 'ses_office', device: t('Computador'), browser: 'Chrome', os: 'Windows', location: 'Campinas, SP', ip: '189.12.xxx.xxx', lastActive: iso(4 * 86_400_000), current: false },
    ],
    notifications: [
      { id: 'ntf_login', kind: 'new_login', title: t('Novo acesso detectado'), body: t('Login em {where}. Se não foi você, encerre a sessão.', { where: 'Safari · iOS (São Paulo, SP)' }), createdAt: iso(3 * 3600_000), read: false, href: '/app/seguranca' },
      { id: 'ntf_welcome', kind: 'system', title: t('Bem-vindo à Nexora'), body: t('Seus dados de demonstração estão prontos. Explore o dashboard e as análises.'), createdAt: iso(2 * 86_400_000), read: true, href: '/app' },
    ],
  };
}

function load(userId: string, demo: boolean): Workspace {
  const stored = readJSON<Workspace | null>(`ws:${userId}`, null);
  if (stored && stored.version === WS_VERSION) {
    // Atualiza a sessão atual com o dispositivo real.
    const sessions = stored.sessions.map((s) => (s.current ? { ...s, lastActive: new Date().toISOString() } : s));
    return { ...stored, sessions };
  }
  if (demo) return { ...createDemoData(), ...demoExtras(), version: WS_VERSION };
  return { ...createEmptyData(), notifications: [], sessions: initialSessions(), version: WS_VERSION };
}

export interface NewTransactionInput extends Omit<Transaction, 'id' | 'createdAt' | 'installment'> {
  /** Parcelas para compras no cartão (gera N lançamentos mensais). */
  installments?: number;
}

interface FinanceState extends Workspace {
  userId: string | null;
  ready: boolean;
  hydrate: (userId: string, opts?: { demo?: boolean; email?: string }) => void;
  reset: () => void;
  loadDemo: () => void;
  clearAll: () => void;
  deleteWorkspace: () => void;
  exportAll: () => Workspace;

  upsert: <K extends CollectionKey>(key: K, item: Item<K>) => void;
  remove: <K extends CollectionKey>(key: K, id: string) => void;

  addTransaction: (input: NewTransactionInput) => Transaction[];
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransactions: (ids: string[]) => void;
  duplicateTransaction: (id: string) => void;
  payInvoice: (args: { invoiceId: string; cardId: string; accountId: string; amount: number; date?: string }) => void;
  contributeGoal: (goalId: string, amount: number, date?: string) => void;
  payDebtInstallment: (debtId: string, accountId?: string) => void;

  notify: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { createdAt?: string }) => AppNotification | null;
  markRead: (id: string, read?: boolean) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;

  endSession: (id: string) => void;
  endOtherSessions: () => void;
  setOnboarding: (p: OnboardingProfile) => void;
}

const emptyWorkspace = (): Workspace => ({ ...createEmptyData(), notifications: [], sessions: [], version: WS_VERSION });

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSave: (() => void) | null = null;

// --- Sincronização com a nuvem (modo Supabase) -------------------------------
let cloudUser: string | null = null;
let remoteTimer: ReturnType<typeof setTimeout> | undefined;
let remoteDirty = false;
let lastRemoteAt: string | undefined;

async function pushRemote(keepalive = false) {
  clearTimeout(remoteTimer);
  const s = useFinance.getState();
  if (!cloudUser || s.userId !== cloudUser || !remoteDirty) return;
  remoteDirty = false;
  const ws = pickWorkspace(s);
  const at = ws.updatedAt ?? new Date().toISOString();
  useSyncStatus.getState().set('syncing');
  try {
    await pushWorkspace(cloudUser, ws, at, { keepalive });
    lastRemoteAt = at;
    useSyncStatus.getState().set('saved');
  } catch {
    remoteDirty = true;
    useSyncStatus.getState().set(navigator.onLine ? 'error' : 'offline');
    remoteTimer = setTimeout(() => void pushRemote(), 15_000);
  }
}

function scheduleRemote() {
  if (!cloudUser) return;
  remoteDirty = true;
  clearTimeout(remoteTimer);
  remoteTimer = setTimeout(() => void pushRemote(), 1500);
}

/** Busca alterações feitas em outro aparelho (ao voltar para o app). */
async function pullIfNewer() {
  const s = useFinance.getState();
  if (!cloudUser || s.userId !== cloudUser || remoteDirty || pendingSave) return;
  try {
    const remote = await pullWorkspace<Workspace>(cloudUser);
    const cur = useFinance.getState();
    if (!remote || cur.userId !== cloudUser || remoteDirty || pendingSave) return;
    if (remote.updatedAt > (cur.updatedAt ?? '') && remote.updatedAt !== lastRemoteAt) {
      lastRemoteAt = remote.updatedAt;
      const ws = { ...remote.data, sessions: cur.sessions, updatedAt: remote.updatedAt };
      useFinance.setState(ws);
      writeJSON(`ws:${cloudUser}`, ws);
    }
    useSyncStatus.getState().set('saved');
  } catch {
    /* sem conexão: tenta de novo na próxima vez */
  }
}

/** Grava imediatamente alterações pendentes (ao fechar/recarregar/ir para segundo plano). */
export function flushWorkspace() {
  clearTimeout(saveTimer);
  pendingSave?.();
  if (remoteDirty) void pushRemote(true);
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushWorkspace);
  window.addEventListener('beforeunload', flushWorkspace);
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? flushWorkspace() : void pullIfNewer()));
  window.addEventListener('online', () => (remoteDirty ? void pushRemote() : void pullIfNewer()));
}

export const useFinance = create<FinanceState>((set, get) => {
  /** Aplica uma mutação e agenda a persistência. */
  const commit = (fn: (s: FinanceState) => Partial<Workspace>) => {
    set((s) => ({ ...fn(s), updatedAt: new Date().toISOString() }));
    scheduleRemote();
    const { userId } = get();
    if (!userId) return;
    clearTimeout(saveTimer);
    pendingSave = () => {
      pendingSave = null;
      const s = get();
      if (s.userId) writeJSON(`ws:${s.userId}`, pickWorkspace(s));
    };
    saveTimer = setTimeout(() => pendingSave?.(), 250);
  };

  return {
    ...emptyWorkspace(),
    userId: null,
    ready: false,

    hydrate: (userId, opts) => {
      clearTimeout(remoteTimer);
      remoteDirty = false;
      cloudUser = null;
      if (cloudEnabled && !opts?.demo && authService.isCloudUser(userId)) {
        void hydrateCloud(userId, opts?.email);
        return;
      }
      useSyncStatus.getState().set('local');
      const ws = load(userId, !!opts?.demo);
      set({ ...ws, userId, ready: true });
      writeJSON(`ws:${userId}`, ws);
    },
    reset: () => {
      flushWorkspace();
      cloudUser = null;
      set({ ...emptyWorkspace(), userId: null, ready: false });
    },
    loadDemo: () => commit((s) => ({ ...createDemoData(), notifications: s.notifications, sessions: s.sessions })),
    clearAll: () => commit((s) => ({ ...createEmptyData(), notifications: [], sessions: s.sessions })),
    deleteWorkspace: () => {
      const { userId } = get();
      cloudUser = null;
      remoteDirty = false;
      if (userId) removeKey(`ws:${userId}`);
      set({ ...emptyWorkspace(), userId: null, ready: false });
    },
    exportAll: () => pickWorkspace(get()),

    upsert: (key, item) =>
      commit((s) => {
        const list = s[key] as { id: string }[];
        const it = item as { id: string };
        const exists = list.some((x) => x.id === it.id);
        return { [key]: exists ? list.map((x) => (x.id === it.id ? it : x)) : [it, ...list] } as Partial<Workspace>;
      }),
    remove: (key, id) =>
      commit((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<Workspace>),

    addTransaction: (input) => {
      const { installments = 1, ...base } = input;
      const n = Math.max(1, Math.min(48, Math.floor(installments)));
      const groupId = n > 1 ? uid('inst') : undefined;
      const per = round2(base.amount / n);
      const created: Transaction[] = Array.from({ length: n }, (_, i) => ({
        ...base,
        id: uid('tx'),
        description: sanitizeText(base.description || t('Sem descrição'), 120),
        notes: base.notes ? sanitizeText(base.notes, 500) : undefined,
        tags: sanitizeTags(base.tags ?? []),
        // Ajusta centavos na última parcela para fechar o total.
        amount: n > 1 && i === n - 1 ? round2(base.amount - per * (n - 1)) : per,
        date: i ? addMonths(base.date, i) : base.date,
        installment: groupId ? { current: i + 1, total: n, groupId } : undefined,
        createdAt: new Date().toISOString(),
      }));
      commit((s) => ({ transactions: [...created, ...s.transactions] }));
      return created;
    },
    updateTransaction: (id, patch) =>
      commit((s) => ({
        transactions: s.transactions.map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
                description: patch.description !== undefined ? sanitizeText(patch.description, 120) : t.description,
                tags: patch.tags ? sanitizeTags(patch.tags) : t.tags,
              }
            : t,
        ),
      })),
    deleteTransactions: (ids) => {
      const set_ = new Set(ids);
      commit((s) => ({ transactions: s.transactions.filter((t) => !set_.has(t.id)) }));
    },
    duplicateTransaction: (id) => {
      const t = get().transactions.find((x) => x.id === id);
      if (!t) return;
      const copy: Transaction = { ...t, id: uid('tx'), date: today(), installment: undefined, createdAt: new Date().toISOString() };
      commit((s) => ({ transactions: [copy, ...s.transactions] }));
    },
    payInvoice: ({ invoiceId, cardId, accountId, amount, date }) => {
      const card = get().cards.find((c) => c.id === cardId);
      const tx: Transaction = {
        id: uid('tx'),
        type: 'transfer',
        amount: round2(amount),
        description: t('Pagamento fatura {card}', { card: card?.name ?? '' }).trim(),
        date: date ?? today(),
        accountId,
        toCardId: cardId,
        invoiceId,
        method: 'transfer',
        status: 'paid',
        tags: ['fatura'],
        recurrence: 'none',
        createdAt: new Date().toISOString(),
      };
      commit((s) => ({ transactions: [tx, ...s.transactions] }));
    },
    contributeGoal: (goalId, amount, date) =>
      commit((s) => ({
        goals: s.goals.map((g) =>
          g.id === goalId ? { ...g, contributions: [...g.contributions, { id: uid('gc'), amount: round2(amount), date: date ?? today() }] } : g,
        ),
      })),
    payDebtInstallment: (debtId, accountId) => {
      const debt = get().debts.find((d) => d.id === debtId);
      if (!debt) return;
      const amount = Math.min(debt.remaining, debt.installmentAmount);
      const remaining = round2(debt.remaining - amount);
      commit((s) => ({
        debts: s.debts.map((d) =>
          d.id === debtId
            ? { ...d, remaining, installmentsPaid: Math.min(d.installments, d.installmentsPaid + 1), status: remaining <= 0 ? 'paid' : d.status === 'late' ? 'active' : d.status }
            : d,
        ),
      }));
      if (accountId) {
        get().addTransaction({
          type: 'expense',
          amount,
          description: t('Parcela {name}', { name: debt.name }),
          categoryId: 'cat_other_exp',
          date: today(),
          accountId,
          method: 'boleto',
          status: 'paid',
          tags: ['dívida'],
          recurrence: 'none',
        });
      }
    },

    notify: (n) => {
      if (n.dedupeKey && get().notifications.some((x) => x.dedupeKey === n.dedupeKey)) return null;
      const item: AppNotification = { ...n, id: uid('ntf'), createdAt: n.createdAt ?? new Date().toISOString(), read: false };
      commit((s) => ({ notifications: [item, ...s.notifications].slice(0, 200) }));
      return item;
    },
    markRead: (id, read = true) => commit((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read } : n)) })),
    markAllRead: () => commit((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    removeNotification: (id) => commit((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

    endSession: (id) => commit((s) => ({ sessions: s.sessions.filter((x) => x.id !== id || x.current) })),
    endOtherSessions: () => commit((s) => ({ sessions: s.sessions.filter((x) => x.current) })),
    setOnboarding: (onboarding) => commit(() => ({ onboarding })),
  };
});

function pickWorkspace(s: FinanceState): Workspace {
  return {
    accounts: s.accounts,
    categories: s.categories,
    transactions: s.transactions,
    cards: s.cards,
    budgets: s.budgets,
    goals: s.goals,
    debts: s.debts,
    investments: s.investments,
    subscriptions: s.subscriptions,
    reminders: s.reminders,
    notifications: s.notifications,
    sessions: s.sessions,
    onboarding: s.onboarding,
    version: WS_VERSION,
    updatedAt: s.updatedAt,
  };
}

/**
 * Carrega o workspace de uma conta na nuvem: usa a cópia mais recente entre
 * este aparelho e o servidor. Sem internet, abre a cópia local e sincroniza depois.
 */
let hydratingFor: string | null = null;
async function hydrateCloud(userId: string, email?: string) {
  if (hydratingFor === userId) return;
  hydratingFor = userId;
  try {
    await doHydrateCloud(userId, email);
  } finally {
    hydratingFor = null;
  }
}

async function doHydrateCloud(userId: string, email?: string) {
  useFinance.setState({ ready: false, userId: null });
  useSyncStatus.getState().set('syncing');
  const cached = readJSON<Workspace | null>(`ws:${userId}`, null);
  let remote: { data: Workspace; updatedAt: string } | null = null;
  let online = true;
  try {
    remote = await Promise.race([
      pullWorkspace<Workspace>(userId),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);
  } catch {
    online = false;
  }
  let ws: Workspace;
  let push = false;
  if (remote && remote.data?.version === WS_VERSION && (!cached?.updatedAt || remote.updatedAt >= cached.updatedAt)) {
    ws = { ...remote.data, updatedAt: remote.updatedAt, sessions: cached?.sessions ?? initialSessions() };
    lastRemoteAt = remote.updatedAt;
  } else if (cached && cached.version === WS_VERSION) {
    ws = cached;
    push = online; // edições feitas sem internet (ou primeira sincronização)
  } else {
    // Primeira vez na nuvem: importa os dados de uma conta antiga, só deste aparelho, com o mesmo e-mail.
    const legacyId = email ? authService.legacyUserId(email) : null;
    const legacy = legacyId ? readJSON<Workspace | null>(`ws:${legacyId}`, null) : null;
    ws = legacy?.version === WS_VERSION ? { ...legacy, sessions: initialSessions() } : load(userId, false);
    ws.updatedAt = new Date().toISOString();
    push = online;
  }
  if (useFinance.getState().userId !== null && useFinance.getState().userId !== userId) return;
  cloudUser = userId;
  useFinance.setState({ ...ws, userId, ready: true });
  writeJSON(`ws:${userId}`, ws);
  if (push) {
    remoteDirty = true;
    void pushRemote();
  } else useSyncStatus.getState().set(online ? 'saved' : 'offline');
}

/** Seletor estável com os dados financeiros (sem ações). */
export function selectData(s: FinanceState): FinanceData {
  return {
    accounts: s.accounts,
    categories: s.categories,
    transactions: s.transactions,
    cards: s.cards,
    budgets: s.budgets,
    goals: s.goals,
    debts: s.debts,
    investments: s.investments,
    subscriptions: s.subscriptions,
    reminders: s.reminders,
  };
}
