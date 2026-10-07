import { useNavigate } from 'react-router-dom';
import { Check, Crown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/store/ui';
import { PRICES, PRO_FEATURES, brl } from '@/lib/plans';

/** "Seja Pro" — aberto quando o usuário do plano Grátis chega a um limite. */
export function UpgradeModal() {
  const reason = useUI((s) => s.upgrade);
  const close = useUI((s) => s.closeUpgrade);
  const navigate = useNavigate();
  return (
    <Modal
      open={!!reason}
      onClose={close}
      title="Desbloqueie a Nexora Pro"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Agora não</Button>
          <Button
            leftIcon={<Crown className="size-4" />}
            onClick={() => {
              close();
              navigate('/app/plano');
            }}
          >
            Ver planos
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">{reason}</p>
      <div className="mt-4 rounded-2xl border border-primary/40 bg-primary-soft/40 p-4">
        <p className="font-display text-lg font-semibold">
          Pro · {brl(PRICES.monthly)}
          <span className="text-sm font-normal text-fg-subtle">/mês</span>
        </p>
        <p className="text-xs text-fg-subtle">ou {brl(PRICES.yearly)}/ano · cancele quando quiser</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
