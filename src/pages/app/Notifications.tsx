import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, BellOff, CalendarClock, CheckCheck, CreditCard, Info, LogIn, Settings2, Shield, Target, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationSettings } from '@/components/common/NotificationSettings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFinance } from '@/store/finance';
import { timeAgo } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { NotificationKind } from '@/types';

const KIND: Record<NotificationKind, { icon: typeof Bell; color: string }> = {
  bill_due: { icon: CalendarClock, color: 'var(--series-4)' },
  invoice_due: { icon: CreditCard, color: 'var(--series-7)' },
  invoice_overdue: { icon: AlertTriangle, color: 'var(--danger)' },
  goal_reached: { icon: Target, color: 'var(--success)' },
  budget_warning: { icon: Wallet, color: 'var(--warning)' },
  budget_exceeded: { icon: AlertTriangle, color: 'var(--danger)' },
  new_transaction: { icon: TrendingUp, color: 'var(--series-1)' },
  new_login: { icon: LogIn, color: 'var(--series-2)' },
  security: { icon: Shield, color: 'var(--series-2)' },
  system: { icon: Info, color: 'var(--primary)' },
};

export default function Notifications() {
  const { notifications, markRead, markAllRead, removeNotification } = useFinance();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [settings, setSettings] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const list = tab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notificações"
        description={unread ? `${unread} não lida(s)` : 'Tudo em dia'}
        actions={
          <>
            <Button variant="secondary" leftIcon={<CheckCheck className="size-4" />} onClick={markAllRead} disabled={!unread}>Marcar todas</Button>
            <Button variant="ghost" size="icon" aria-label="Configurações de notificação" onClick={() => setSettings(true)}><Settings2 className="size-[18px]" /></Button>
          </>
        }
      />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ value: 'all', label: 'Todas', count: notifications.length }, { value: 'unread', label: 'Não lidas', count: unread }]} />
      <Card>
        {list.length === 0 ? (
          <EmptyState icon={<BellOff />} title={tab === 'unread' ? 'Nenhuma notificação não lida' : 'Sem notificações'} description="Avisaremos sobre vencimentos, faturas, orçamentos, metas e segurança." />
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {list.map((n) => {
                const K = KIND[n.kind];
                return (
                  <motion.li key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={cn('group relative flex gap-3 p-4', !n.read && 'bg-primary-soft/40')}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${K.color} 16%, transparent)`, color: K.color }}>
                      <K.icon className="size-[18px]" aria-hidden />
                    </span>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        markRead(n.id);
                        if (n.href) navigate(n.href);
                      }}
                    >
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-sm text-fg-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-fg-subtle">{timeAgo(n.createdAt)}</p>
                    </button>
                    <div className="flex shrink-0 items-start gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <Button variant="ghost" size="icon-sm" aria-label={n.read ? 'Marcar como não lida' : 'Marcar como lida'} onClick={() => markRead(n.id, !n.read)}><CheckCheck className="size-4" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Excluir notificação" onClick={() => removeNotification(n.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Card>
      <Modal open={settings} onClose={() => setSettings(false)} title="Configurações de notificação" size="md">
        <NotificationSettings />
      </Modal>
    </div>
  );
}
