import { useEffect, useState } from 'react';
import { ScanFace } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { biometricAvailable, biometricEnabledFor, biometricLabel, disableBiometric, enableBiometric } from '@/services/biometric';

export function BiometricSettings() {
  const user = useAuth((s) => s.user)!;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(() => biometricEnabledFor(user.id));
  const [busy, setBusy] = useState(false);
  const label = biometricLabel();

  useEffect(() => {
    biometricAvailable().then(setAvailable);
  }, []);

  const toggle = async (on: boolean) => {
    if (!on) {
      disableBiometric(user.id);
      setEnabled(false);
      toast.success(`${label} desativado neste aparelho`);
      return;
    }
    setBusy(true);
    try {
      await enableBiometric(user);
      setEnabled(true);
      toast.success(`${label} ativado`, { description: 'Use na tela de login para entrar sem senha.' });
    } catch {
      toast.error(`Não foi possível ativar o ${label}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title={`Entrar com ${label}`} icon={<ScanFace />} description="Acesso rápido e seguro neste aparelho" />
      <CardBody>
        {available === false ? (
          <p className="text-sm text-fg-subtle">Este aparelho ou navegador não oferece Face ID, digital ou Windows Hello. No iPhone, use o Safari (ou a Nexora instalada na tela de início).</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-fg-muted">
              {enabled ? `${label} ativo: na tela de login, toque em “Entrar com ${label}”.` : `Ative para entrar sem digitar a senha. A biometria fica no aparelho — a Nexora nunca recebe seu rosto ou digital.`}
            </p>
            <Switch checked={enabled} onChange={toggle} disabled={busy || available === null} label={`Entrar com ${label}`} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
