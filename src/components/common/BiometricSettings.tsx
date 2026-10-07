import { useEffect, useState } from 'react';
import { ScanFace } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { t } from '@/i18n';
import { biometricAvailable, biometricEnabledFor, biometricLabel, disableBiometric, enableBiometric } from '@/services/biometric';

export function BiometricSettings() {
  const user = useAuth((s) => s.user)!;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(() => biometricEnabledFor(user.id));
  const [busy, setBusy] = useState(false);
  const label = t(biometricLabel());

  useEffect(() => {
    biometricAvailable().then(setAvailable);
  }, []);

  const toggle = async (on: boolean) => {
    if (!on) {
      disableBiometric(user.id);
      setEnabled(false);
      toast.success(t('{label} desativado neste aparelho', { label }));
      return;
    }
    setBusy(true);
    try {
      await enableBiometric(user);
      setEnabled(true);
      toast.success(t('{label} ativado', { label }), { description: t('Use na tela de login para entrar sem senha.') });
    } catch {
      toast.error(t('Não foi possível ativar o {label}', { label }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title={t('Entrar com {label}', { label })} icon={<ScanFace />} description={t('Acesso rápido e seguro neste aparelho')} />
      <CardBody>
        {available === false ? (
          <p className="text-sm text-fg-subtle">{t('Este aparelho ou navegador não oferece Face ID, digital ou Windows Hello. No iPhone, use o Safari (ou a Nexora instalada na tela de início).')}</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-fg-muted">
              {enabled ? t('{label} ativo: na tela de login, toque em “Entrar com {label}”.', { label }) : t('Ative para entrar sem digitar a senha. A biometria fica no aparelho — a Nexora nunca recebe seu rosto ou digital.')}
            </p>
            <Switch checked={enabled} onChange={toggle} disabled={busy || available === null} label={t('Entrar com {label}', { label })} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
