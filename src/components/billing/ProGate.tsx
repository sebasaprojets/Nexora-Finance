import { Crown, Lock } from 'lucide-react';
import { t } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/store/ui';
import type { ProFeature } from '@/lib/plans';

/** Tela de bloqueio elegante para recursos exclusivos do Pro. */
export function ProGate({ feature, title, text }: { feature: ProFeature; title: string; text: string }) {
  const openUpgrade = useUI((s) => s.openUpgrade);
  return (
    <Card className="holo flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Lock className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-fg-muted">{text}</p>
      <Button className="mt-6" leftIcon={<Crown className="size-4" />} onClick={() => openUpgrade({ feature })}>
        {t('Desbloquear com o Pro')}
      </Button>
    </Card>
  );
}
