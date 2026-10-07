import { useEffect, useState } from 'react';
import { ScanFace, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { toast, useToasts } from '@/store/toast';
import { notifyUser } from '@/services/notifications';
import { t } from '@/i18n';
import { biometricAvailable, biometricEnabledFor, biometricLabel, biometricPrompted, enableBiometric, setBiometricPrompted } from '@/services/biometric';

/**
 * Depois do primeiro acesso, oferece ativar Face ID / digital para entrar mais rápido.
 * Aparece uma vez por conta e aparelho (pode ser ativado depois em Segurança).
 */
export function BiometricPrompt() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = t(biometricLabel());

  useEffect(() => {
    if (!user || biometricPrompted(user.id) || biometricEnabledFor(user.id)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    document.body.dataset.biometricPending = '1';
    const clear = () => delete document.body.dataset.biometricPending;
    biometricAvailable().then((ok) => {
      if (cancelled) return;
      if (!ok) return clear();
      // Espera a abertura animada e outros diálogos saírem da tela.
      const tryOpen = () => {
        if (cancelled) return;
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) timer = setTimeout(tryOpen, 500);
        else {
          useToasts.setState({ toasts: [] });
          setOpen(true);
        }
      };
      timer = setTimeout(tryOpen, 400);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clear();
    };
  }, [user]);

  if (!user) return null;

  const close = () => {
    setBiometricPrompted(user.id);
    setOpen(false);
    delete document.body.dataset.biometricPending;
  };

  const activate = async () => {
    setBusy(true);
    try {
      await enableBiometric(user);
      toast.success(t('{label} ativado', { label }), { description: t('Na próxima vez, entre sem digitar a senha.') });
      notifyUser({ kind: 'security', title: t('{label} ativado neste aparelho', { label }), body: t('Você pode desativar a qualquer momento em Segurança.'), href: '/app/seguranca' });
      close();
    } catch {
      toast.error(t('Não foi possível ativar o {label}', { label }), { description: t('Tente novamente em Segurança.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={t('Entrar com {label}?', { label })} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className="relative my-2">
          <div className="absolute inset-0 rounded-3xl bg-primary/25 blur-2xl" aria-hidden />
          <span className="relative grid size-20 place-items-center rounded-3xl border border-border bg-surface-2 text-primary">
            <ScanFace className="size-10" aria-hidden />
          </span>
        </div>
        <p className="mt-3 text-sm text-fg-muted">
          {t('Acesse a Nexora em um segundo, sem digitar a senha.')} <strong className="text-fg">{t('Seu rosto ou digital nunca sai do aparelho')}</strong> — {t('quem confirma é o próprio sistema do celular.')}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle">
          <ShieldCheck className="size-3.5 text-success" aria-hidden /> {t('Você pode desativar quando quiser em Segurança.')}
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <Button size="lg" className="w-full" loading={busy} leftIcon={<ScanFace className="size-5" />} onClick={activate}>
            {t('Ativar {label}', { label })}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={close}>
            {t('Agora não')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
