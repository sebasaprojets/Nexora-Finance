import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Crown, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { BUSINESS, whatsappLink } from '@/config/business';
import { FREE_FEATURES, PRICES, PRO_FEATURES, billingEnabled, brl, hasPro } from '@/lib/plans';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

/** Meu plano: assinar, acompanhar e cancelar a Nexora Pro. */
export default function Plan() {
  const user = useAuth((s) => s.user)!;
  const demo = user.provider === 'demo';
  const refreshUser = useAuth((s) => s.refreshUser);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [params, setParams] = useSearchParams();
  const polled = useRef(false);
  const paid = billingEnabled && hasPro(user) && !demo;
  const founderPrice = user.founder ? PRICES.founder : null;

  // Voltando do Mercado Pago: o webhook ativa o plano em alguns segundos.
  useEffect(() => {
    if (!params.get('pagamento') || polled.current) return;
    polled.current = true;
    setParams({}, { replace: true });
    let tries = 0;
    const tick = async () => {
      await refreshUser().catch(() => {});
      if (hasPro(useAuth.getState().user)) return toast.success('Bem-vindo à Nexora Pro! 🎉', { description: 'Seu plano já está ativo.' });
      if (++tries < 8) setTimeout(tick, 4000);
      else toast.info('Pagamento em processamento', { description: 'Pix e boleto podem levar alguns minutos. Avisaremos quando o Pro for ativado.' });
    };
    void tick();
  }, [params, setParams, refreshUser]);

  const subscribe = async () => {
    setBusy(true);
    try {
      const { startCheckout } = await import('@/services/billing');
      await startCheckout(cycle);
    } catch (e) {
      toast.error('Não foi possível abrir o pagamento', { description: e instanceof Error ? e.message : undefined });
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const { cancelSubscription } = await import('@/services/billing');
      await cancelSubscription();
      await refreshUser();
      toast.success('Assinatura cancelada', { description: 'Você não será mais cobrado.' });
    } catch (e) {
      toast.error('Não foi possível cancelar agora', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const monthly = founderPrice ?? PRICES.monthly;
  const yearlyPerMonth = PRICES.yearly / 12;
  const saving = Math.round((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100);
  const wa = whatsappLink('Olá! Tenho uma dúvida sobre o plano da Nexora.');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Meu plano" description="Escolha como usar a Nexora. Sem fidelidade — cancele quando quiser." />

      {!billingEnabled && (
        <Card className="holo flex items-start gap-3 p-5">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Beta aberto: todos os recursos Pro liberados</p>
            <p className="mt-1 text-sm text-fg-subtle">Durante o beta você usa tudo de graça. Quem participar agora garante o preço de fundador ({brl(PRICES.founder)}/mês) quando os planos forem lançados.</p>
          </div>
        </Card>
      )}

      {billingEnabled && paid && (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Crown className="size-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Você é Nexora Pro{user.founder ? ' · Fundador' : ''}</p>
            <p className="text-sm text-fg-subtle">
              {user.planStatus === 'cancelled'
                ? `Assinatura cancelada${user.planRenewsAt ? ` — acesso Pro até ${formatDate(user.planRenewsAt.slice(0, 10))}` : ''}.`
                : user.planRenewsAt
                  ? `Próxima cobrança em ${formatDate(user.planRenewsAt.slice(0, 10))}.`
                  : 'Assinatura ativa.'}
            </p>
          </div>
          {user.planStatus !== 'cancelled' && (
            <Button variant="ghost" onClick={() => setConfirmCancel(true)}>Cancelar assinatura</Button>
          )}
        </Card>
      )}

      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1" role="radiogroup" aria-label="Período de cobrança">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={cycle === c}
              onClick={() => setCycle(c)}
              className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', cycle === c ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg')}
            >
              {c === 'monthly' ? 'Mensal' : <>Anual {saving > 0 && <span className="ml-1 text-xs opacity-80">−{saving}%</span>}</>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="font-display text-lg font-semibold">Grátis</p>
          <p className="mt-1 font-display text-3xl font-semibold">R$ 0</p>
          <p className="text-xs text-fg-subtle">para sempre</p>
          <ul className="mt-5 space-y-2 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden /> {f}</li>
            ))}
          </ul>
          {billingEnabled && !paid && <Badge className="mt-5">Seu plano atual</Badge>}
        </Card>

        <Card className="relative overflow-hidden border-primary/50 p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(400px_circle_at_100%_0%,rgba(123,109,255,0.18),transparent_60%)]" aria-hidden />
          <div className="relative">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><Crown className="size-5 text-primary" aria-hidden /> Pro {user.founder && <Badge tone="primary">Preço de fundador</Badge>}</p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {cycle === 'monthly' ? brl(monthly) : brl(PRICES.yearly)}
              <span className="text-sm font-normal text-fg-subtle">{cycle === 'monthly' ? '/mês' : '/ano'}</span>
            </p>
            <p className="text-xs text-fg-subtle">{cycle === 'yearly' ? `equivale a ${brl(yearlyPerMonth)}/mês` : 'Pix ou cartão · cancele quando quiser'}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}</li>
              ))}
            </ul>
            {billingEnabled && !paid && !demo && (
              <Button size="lg" className="mt-6 w-full" loading={busy} leftIcon={<Crown className="size-4" />} onClick={subscribe}>
                Assinar Pro
              </Button>
            )}
            {demo && billingEnabled && <p className="mt-6 text-sm text-fg-subtle">Crie sua conta para assinar o Pro.</p>}
            {(hasPro(user) && !billingEnabled) && <Badge tone="success" className="mt-5">Liberado no beta</Badge>}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 text-sm text-fg-subtle sm:grid-cols-2">
        <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> Pagamento processado pelo Mercado Pago. A Nexora nunca vê nem guarda os dados do seu cartão.</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> Direito de arrependimento: cancele em até 7 dias da primeira cobrança e devolvemos o valor integral.</p>
      </div>
      {(wa || BUSINESS.supportEmail) && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-fg-subtle">
          <MessageCircle className="size-4" aria-hidden /> Dúvidas sobre cobrança?
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Fale no WhatsApp</a>}
          {BUSINESS.supportEmail && <a href={`mailto:${BUSINESS.supportEmail}`} className="font-medium text-primary hover:underline">{BUSINESS.supportEmail}</a>}
        </p>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        title="Cancelar a assinatura Pro?"
        description="As próximas cobranças serão canceladas e o Pro continua até o fim do período já pago. Seus dados ficam salvos; depois disso, criar itens acima dos limites do Grátis exigirá o Pro."
        confirmLabel="Cancelar assinatura"
      />
    </div>
  );
}
