import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth';
import { authenticateBiometric, biometricAvailable, biometricLabel, biometricUsers } from '@/services/biometric';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

/** Botão "Entrar com Face ID" — aparece se a biometria foi ativada neste aparelho. */
export function BiometricLogin({ from }: { from?: string }) {
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();
  const label = biometricLabel();

  useEffect(() => {
    biometricAvailable().then((ok) => {
      if (!ok) return;
      setNames(biometricUsers().map((id) => authService.displayName(id)).filter((n): n is string => !!n));
    });
  }, []);

  if (!names.length) return null;

  const go = async () => {
    setBusy(true);
    try {
      const userId = await authenticateBiometric();
      const r = await authService.signInWithBiometric(userId);
      setAuth(r);
      toast.success(`Bem-vindo de volta, ${r.user.name.split(' ')[0]}!`);
      navigate(r.user.onboarded ? (from ?? '/app') : '/onboarding', { replace: true });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'NotAllowedError')) toast.error(`Não foi possível entrar com ${label}`, { description: 'Use seu e-mail e senha.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6">
      <Button size="lg" className="h-14 w-full text-base" loading={busy} leftIcon={<ScanFace className="size-6" />} onClick={go}>
        Entrar com {label}
      </Button>
      <p className="mt-2 text-center text-xs text-fg-subtle">{names.length === 1 ? `Conta de ${names[0].split(' ')[0]} neste aparelho` : `${names.length} contas com ${label} neste aparelho`}</p>
    </div>
  );
}
