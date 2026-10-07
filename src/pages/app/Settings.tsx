import { Database, Eye, Globe, GraduationCap, Monitor, Moon, Palette, RotateCcw, Sparkles, Sun, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationSettings } from '@/components/common/NotificationSettings';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { Segmented } from '@/components/ui/Segmented';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useSettings } from '@/store/settings';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { CURRENCIES, formatMoney } from '@/lib/format';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { CurrencyCode, Language, ThemeMode } from '@/types';

export default function SettingsPage() {
  const s = useSettings();
  const loadDemo = useFinance((st) => st.loadDemo);
  const [confirmDemo, setConfirmDemo] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Configurações" description="Personalize a Nexora do seu jeito." />

      <Card>
        <CardHeader title="Aparência" icon={<Palette />} />
        <CardBody className="space-y-5">
          <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3">
            {([
              { v: 'dark', label: 'Escuro', icon: Moon },
              { v: 'light', label: 'Claro', icon: Sun },
              { v: 'system', label: 'Sistema', icon: Monitor },
            ] as { v: ThemeMode; label: string; icon: typeof Moon }[]).map((t) => (
              <button
                key={t.v}
                role="radio"
                aria-checked={s.theme === t.v}
                onClick={() => s.set({ theme: t.v })}
                className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all', s.theme === t.v ? 'border-primary bg-primary-soft shadow-[var(--ring)]' : 'border-border hover:bg-surface-2')}
              >
                <t.icon className="size-5" aria-hidden />
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-fg-subtle" aria-hidden /> Animações</p>
              <p className="text-xs text-fg-subtle">“Sistema” respeita a preferência de movimento reduzido do dispositivo.</p>
            </div>
            <Segmented size="sm" label="Animações" value={s.reducedMotion} onChange={(v) => s.set({ reducedMotion: v })} options={[{ value: 'system', label: 'Sistema' }, { value: 'off', label: 'Ativas' }, { value: 'on', label: 'Reduzidas' }]} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium"><Eye className="size-4 text-fg-subtle" aria-hidden /> Ocultar valores</p>
              <p className="text-xs text-fg-subtle">Esconde saldos e valores na tela (útil em locais públicos).</p>
            </div>
            <Switch checked={s.hideValues} onChange={(v) => s.set({ hideValues: v })} label="Ocultar valores" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Região" icon={<Globe />} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted">
            <span className="flex items-center gap-1.5"><Wallet className="size-3.5" aria-hidden /> Moeda</span>
            <Select value={s.currency} onChange={(e) => { s.set({ currency: e.target.value as CurrencyCode }); toast.success('Moeda atualizada', { description: `Exemplo: ${formatMoney(1250.5, { currency: e.target.value as CurrencyCode })}` }); }}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} · {c.label}</option>)}
            </Select>
            <span className="text-xs font-normal text-fg-subtle">Exemplo: {formatMoney(1250.5, { currency: s.currency })} · a conversão de valores não é automática.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted">
            <span className="flex items-center gap-1.5"><Globe className="size-3.5" aria-hidden /> Idioma</span>
            <Select value={s.language} onChange={(e) => s.set({ language: e.target.value as Language })}>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US" disabled>English (em breve)</option>
              <option value="es-ES" disabled>Español (em breve)</option>
            </Select>
            <span className="text-xs font-normal text-fg-subtle">Datas no formato DD/MM/AAAA.</span>
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tutoriais" icon={<GraduationCap />} description="Guias passo a passo nas telas principais (Dashboard, Transações, Análises, Cartões, Orçamentos, Metas e Nexora AI)." />
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Mostrar tutoriais automaticamente</p>
              <p className="text-xs text-fg-subtle">Aparecem na primeira visita a cada tela. Você sempre pode abrir pelo botão “Como usar”.</p>
            </div>
            <Switch checked={s.tutorials.enabled} onChange={(v) => { s.setTutorialsEnabled(v); toast.success(v ? 'Tutoriais ativados' : 'Tutoriais desativados'); }} label="Mostrar tutoriais automaticamente" />
          </div>
          <Button
            variant="secondary"
            leftIcon={<RotateCcw className="size-4" />}
            onClick={() => { s.resetTutorials(); toast.success('Tutoriais reiniciados', { description: 'Eles aparecerão novamente ao visitar cada tela.' }); }}
          >
            Rever todos os tutoriais
          </Button>
          {s.tutorials.seen.length > 0 && <p className="text-xs text-fg-subtle">{s.tutorials.seen.length} tutorial(is) já visto(s) ou pulado(s).</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notificações" />
        <CardBody>
          <NotificationSettings />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Dados de demonstração" icon={<Database />} description="Substitui seus dados atuais por um conjunto fictício para explorar a plataforma." />
        <CardBody>
          <Button variant="secondary" onClick={() => setConfirmDemo(true)}>Carregar dados de exemplo</Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        title="Carregar dados de exemplo?"
        description="Suas contas, transações, metas e demais dados serão substituídos. Exporte seus dados antes, se quiser mantê-los."
        confirmLabel="Substituir dados"
        onConfirm={() => { loadDemo(); toast.success('Dados de exemplo carregados'); }}
      />
    </div>
  );
}
