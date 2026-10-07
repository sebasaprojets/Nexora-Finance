import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { Check, Crown, Lock, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { useUI } from '@/store/ui';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { resourceCount } from '@/hooks/usePlan';
import { FREE_LIMITS, PRICES, RESOURCE_LABEL, TRIAL_DAYS, brl, proFeatures, startTrial, trialAvailable, type ProFeature } from '@/lib/plans';

const FEATURE_MSG: Record<ProFeature, string> = {
  export: 'Relatórios em PDF e Excel são exclusivos do plano Pro. A exportação em CSV continua grátis.',
  attachments: 'Anexar comprovantes às transações é exclusivo do plano Pro.',
  compare: 'A comparação entre períodos é exclusiva do plano Pro.',
};

/** "Seja Pro" — aberto quando o usuário do Grátis chega a um limite ou toca num recurso Pro. */
export function UpgradeModal() {
  const req = useUI((s) => s.upgrade);
  const close = useUI((s) => s.closeUpgrade);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const canTrial = trialAvailable(user);

  const used = req?.resource ? resourceCount(req.resource, user?.id) : 0;
  const limit = req?.resource ? FREE_LIMITS[req.resource] : 0;

  const goPlans = () => {
    close();
    navigate('/app/plano');
  };
  const beginTrial = () => {
    if (!user) return;
    startTrial(user.id);
    useAuth.setState({ user: { ...user } }); // re-renderiza com o acesso Pro
    close();
    toast.success(t('Teste do Pro ativado! 🎉'), { description: t('Você tem {n} dias com tudo liberado.', { n: TRIAL_DAYS }) });
  };

  return (
    <Modal
      open={!!req}
      onClose={close}
      title={req?.resource ? t('Você chegou ao limite do plano Grátis') : t('Recurso do plano Pro')}
      footer={
        <>
          <Button variant="ghost" onClick={close}>{t('Agora não')}</Button>
          {canTrial ? (
            <>
              <Button variant="secondary" className="hidden sm:inline-flex" onClick={goPlans}>{t('Ver planos')}</Button>
              <Button leftIcon={<Sparkles className="size-4" />} onClick={beginTrial}>
                {t('Testar Pro grátis')}
              </Button>
            </>
          ) : (
            <Button leftIcon={<Crown className="size-4" />} onClick={goPlans}>
              {t('Ver planos')}
            </Button>
          )}
        </>
      }
    >
      {req?.resource ? (
        <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t(RESOURCE_LABEL[req.resource])}</span>
            <span className="tabular font-semibold">{t('{used} de {limit}', { used, limit })}</span>
          </div>
          <Progress value={Math.min(100, (used / limit) * 100)} color="var(--warning)" className="mt-2" size="sm" label={t('Uso do plano')} />
          <p className="mt-3 text-sm text-fg-muted">
            {req.resource === 'ai'
              ? t('Suas perguntas grátis deste mês acabaram. Elas renovam no dia 1º — ou seja Pro para perguntar sem limite.')
              : t('Seus dados continuam salvos. Para adicionar mais, seja Pro.')}
          </p>
        </div>
      ) : (
        req?.feature && (
          <p className="flex items-start gap-2 text-sm text-fg-muted">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t(FEATURE_MSG[req.feature])}
          </p>
        )
      )}

      <div className="mt-4 rounded-2xl border border-primary/40 bg-primary-soft/40 p-4">
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          <Crown className="size-5 text-primary" aria-hidden /> Pro · {brl(PRICES.monthly)}
          <span className="text-sm font-normal text-fg-subtle">{t('/mês')}</span>
        </p>
        <p className="text-xs text-fg-subtle">{t('ou {preco}/ano · cancele quando quiser', { preco: brl(PRICES.yearly) })}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {proFeatures().map((f) => (
            <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}</li>
          ))}
        </ul>
      </div>
      {canTrial && (
        <p className="mt-3 text-center text-xs text-fg-subtle">
          {t('{n} dias grátis, sem cartão de crédito. Depois, você volta ao Grátis sem perder nada.', { n: TRIAL_DAYS })}
        </p>
      )}
    </Modal>
  );
}
