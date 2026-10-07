import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { Check, Crown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/store/ui';
import { PRICES, brl, proFeatures } from '@/lib/plans';

/** "Seja Pro" — aberto quando o usuário do plano Grátis chega a um limite. */
export function UpgradeModal() {
  const reason = useUI((s) => s.upgrade);
  const close = useUI((s) => s.closeUpgrade);
  const navigate = useNavigate();
  return (
    <Modal
      open={!!reason}
      onClose={close}
      title={t('Desbloqueie a Nexora Pro')}
      footer={
        <>
          <Button variant="ghost" onClick={close}>{t('Agora não')}</Button>
          <Button
            leftIcon={<Crown className="size-4" />}
            onClick={() => {
              close();
              navigate('/app/plano');
            }}
          >
            {t('Ver planos')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">{reason && t(reason)}</p>
      <div className="mt-4 rounded-2xl border border-primary/40 bg-primary-soft/40 p-4">
        <p className="font-display text-lg font-semibold">
          Pro · {brl(PRICES.monthly)}
          <span className="text-sm font-normal text-fg-subtle">{t('/mês')}</span>
        </p>
        <p className="text-xs text-fg-subtle">{t('ou {preco}/ano · cancele quando quiser', { preco: brl(PRICES.yearly) })}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {proFeatures().map((f) => (
            <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {t(f)}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
