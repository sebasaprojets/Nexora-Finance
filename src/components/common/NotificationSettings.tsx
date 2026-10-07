import { useState } from 'react';
import { BellRing, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/toast';
import { enablePush, pushPermission, sendTestNotification } from '@/services/notifications';
import type { NotificationPreferences } from '@/types';
import { t } from '@/i18n';

const ITEMS: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
  { key: 'billDue', label: 'Contas vencendo', desc: 'Parcelas, assinaturas e lembretes próximos do vencimento' },
  { key: 'invoices', label: 'Faturas', desc: 'Fatura próxima do vencimento ou atrasada' },
  { key: 'budgets', label: 'Orçamentos', desc: 'Ao atingir 70%, 90% e 100% do limite' },
  { key: 'goals', label: 'Metas', desc: 'Quando uma meta for atingida' },
  { key: 'transactions', label: 'Novas transações', desc: 'Confirmação a cada lançamento' },
  { key: 'security', label: 'Segurança', desc: 'Login em novo dispositivo e alterações importantes' },
  { key: 'email', label: 'Resumo por e-mail', desc: 'Requer backend configurado' },
];

export function NotificationSettings() {
  const prefs = useSettings((s) => s.notifications);
  const setPrefs = useSettings((s) => s.setNotifications);
  const [perm, setPerm] = useState(pushPermission());
  const [loading, setLoading] = useState(false);

  const togglePush = async (on: boolean) => {
    if (!on) {
      setPrefs({ push: false });
      return;
    }
    setLoading(true);
    const r = await enablePush();
    setLoading(false);
    setPerm(pushPermission());
    if (r.ok) {
      setPrefs({ push: true });
      toast.success(t('Notificações do dispositivo ativadas'), { description: r.reason });
      void sendTestNotification();
    } else toast.error(t('Não foi possível ativar'), { description: r.reason });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 rounded-xl border border-border bg-surface-2/50 p-4">
        <BellRing className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('Notificações no dispositivo')}</p>
          <p className="text-xs text-fg-subtle">{t('Desktop (navegador) e celular (PWA instalado). No iPhone, instale a Nexora na tela de início.')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={perm === 'granted' ? 'success' : perm === 'denied' ? 'danger' : 'neutral'}>
              {t('Permissão: {status}', { status: perm === 'granted' ? t('concedida') : perm === 'denied' ? t('bloqueada') : perm === 'unsupported' ? t('não suportado') : t('não solicitada') })}
            </Badge>
            {prefs.push && perm === 'granted' && (
              <Button size="sm" variant="ghost" leftIcon={<Send className="size-3.5" />} onClick={() => sendTestNotification()}>{t('Enviar teste')}</Button>
            )}
          </div>
        </div>
        <Switch checked={prefs.push && perm === 'granted'} onChange={togglePush} disabled={loading || perm === 'unsupported'} label={t('Notificações no dispositivo')} />
      </div>
      <ul className="divide-y divide-border">
        {ITEMS.map((i) => (
          <li key={i.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">{t(i.label)}</p>
              <p className="text-xs text-fg-subtle">{t(i.desc)}</p>
            </div>
            <Switch checked={prefs[i.key]} onChange={(v) => setPrefs({ [i.key]: v })} label={t(i.label)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
