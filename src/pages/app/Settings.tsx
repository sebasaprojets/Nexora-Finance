import { Clapperboard, Database, Eye, Globe, GraduationCap, Monitor, Moon, Palette, Play, RotateCcw, Sparkles, Sun, Wallet } from 'lucide-react';
import { REPLAY_INTRO_EVENT } from '@/components/brand/IntroSplash';
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
import { formatDate, today } from '@/lib/dates';
import { t, useLang, LANGS, type Lang } from '@/i18n';
import type { CurrencyCode, ThemeMode } from '@/types';

export default function SettingsPage() {
  const s = useSettings();
  const loadDemo = useFinance((st) => st.loadDemo);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const lang = useLang((st) => st.lang);
  const setLang = useLang((st) => st.setLang);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t('Configurações')} description={t('Personalize a Nexora do seu jeito.')} />

      <Card>
        <CardHeader title={t('Aparência')} icon={<Palette />} />
        <CardBody className="space-y-5">
          <div role="radiogroup" aria-label={t('Tema')} className="grid grid-cols-3 gap-3">
            {([
              { v: 'dark', label: t('Escuro'), icon: Moon },
              { v: 'light', label: t('Claro'), icon: Sun },
              { v: 'system', label: t('Sistema'), icon: Monitor },
            ] as { v: ThemeMode; label: string; icon: typeof Moon }[]).map((th) => (
              <button
                key={th.v}
                role="radio"
                aria-checked={s.theme === th.v}
                onClick={() => s.set({ theme: th.v })}
                className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all', s.theme === th.v ? 'border-primary bg-primary-soft shadow-[var(--ring)]' : 'border-border hover:bg-surface-2')}
              >
                <th.icon className="size-5" aria-hidden />
                {th.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-fg-subtle" aria-hidden /> {t('Animações')}</p>
              <p className="text-xs text-fg-subtle">{t('“Sistema” respeita a preferência de movimento reduzido do dispositivo.')}</p>
            </div>
            <Segmented size="sm" label={t('Animações')} value={s.reducedMotion} onChange={(v) => s.set({ reducedMotion: v })} options={[{ value: 'system', label: t('Sistema') }, { value: 'off', label: t('Ativas') }, { value: 'on', label: t('Reduzidas') }]} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium"><Clapperboard className="size-4 text-fg-subtle" aria-hidden /> {t('Abertura animada')}</p>
              <p className="text-xs text-fg-subtle">{t('Animação do logo exibida sempre que a Nexora é aberta.')}</p>
              <button type="button" onClick={() => window.dispatchEvent(new Event(REPLAY_INTRO_EVENT))} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Play className="size-3" aria-hidden /> {t('Ver agora')}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium"><Eye className="size-4 text-fg-subtle" aria-hidden /> {t('Ocultar valores')}</p>
              <p className="text-xs text-fg-subtle">{t('Esconde saldos e valores na tela (útil em locais públicos).')}</p>
            </div>
            <Switch checked={s.hideValues} onChange={(v) => s.set({ hideValues: v })} label={t('Ocultar valores')} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('Região')} icon={<Globe />} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted">
            <span className="flex items-center gap-1.5"><Wallet className="size-3.5" aria-hidden /> {t('Moeda')}</span>
            <Select value={s.currency} onChange={(e) => { s.set({ currency: e.target.value as CurrencyCode }); toast.success(t('Moeda atualizada'), { description: t('Exemplo: {valor}', { valor: formatMoney(1250.5, { currency: e.target.value as CurrencyCode }) }) }); }}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} · {c.label}</option>)}
            </Select>
            <span className="text-xs font-normal text-fg-subtle">{t('Exemplo: {valor}', { valor: formatMoney(1250.5, { currency: s.currency }) })} · {t('a conversão de valores não é automática.')}</span>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted">
            <span className="flex items-center gap-1.5"><Globe className="size-3.5" aria-hidden /> {t('Idioma')}</span>
            <Select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
            <span className="text-xs font-normal text-fg-subtle">{t('Datas no formato {exemplo}.', { exemplo: formatDate(today()) })}</span>
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('Tutoriais')} icon={<GraduationCap />} description={t('Guias passo a passo nas telas principais (Dashboard, Transações, Análises, Cartões, Orçamentos, Metas e Nexora AI).')} />
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t('Mostrar tutoriais automaticamente')}</p>
              <p className="text-xs text-fg-subtle">{t('Aparecem na primeira visita a cada tela. Você sempre pode abrir pelo botão “Como usar”.')}</p>
            </div>
            <Switch checked={s.tutorials.enabled} onChange={(v) => { s.setTutorialsEnabled(v); toast.success(v ? t('Tutoriais ativados') : t('Tutoriais desativados')); }} label={t('Mostrar tutoriais automaticamente')} />
          </div>
          <Button
            variant="secondary"
            leftIcon={<RotateCcw className="size-4" />}
            onClick={() => { s.resetTutorials(); toast.success(t('Tutoriais reiniciados'), { description: t('Eles aparecerão novamente ao visitar cada tela.') }); }}
          >
            {t('Rever todos os tutoriais')}
          </Button>
          {s.tutorials.seen.length > 0 && <p className="text-xs text-fg-subtle">{t(s.tutorials.seen.length === 1 ? '{n} tutorial já visto ou pulado.' : '{n} tutoriais já vistos ou pulados.', { n: s.tutorials.seen.length })}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('Notificações')} />
        <CardBody>
          <NotificationSettings />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('Dados de demonstração')} icon={<Database />} description={t('Substitui seus dados atuais por um conjunto fictício para explorar a plataforma.')} />
        <CardBody>
          <Button variant="secondary" onClick={() => setConfirmDemo(true)}>{t('Carregar dados de exemplo')}</Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        title={t('Carregar dados de exemplo?')}
        description={t('Suas contas, transações, metas e demais dados serão substituídos. Exporte seus dados antes, se quiser mantê-los.')}
        confirmLabel={t('Substituir dados')}
        onConfirm={() => { loadDemo(); toast.success(t('Dados de exemplo carregados')); }}
      />
    </div>
  );
}
