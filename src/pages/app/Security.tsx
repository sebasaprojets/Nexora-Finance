import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, LogOut, Monitor, ShieldCheck, Smartphone, Tablet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PasswordInput, StrengthMeter } from '@/components/common/PasswordInput';
import { BiometricSettings } from '@/components/common/BiometricSettings';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { authService, AuthError } from '@/services/auth';
import { notifyUser } from '@/services/notifications';
import { formatDateTime, timeAgo } from '@/lib/dates';
import { t } from '@/i18n';

const schema = z
  .object({
    current: z.string().min(1, 'Informe a senha atual'),
    next: z.string().min(8, 'Mínimo de 8 caracteres').regex(/[A-Za-z]/, 'Inclua uma letra').regex(/\d/, 'Inclua um número'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'As senhas não coincidem' })
  .refine((v) => v.next !== v.current, { path: ['next'], message: 'A nova senha deve ser diferente da atual' });
type Values = z.infer<typeof schema>;

export default function Security() {
  const user = useAuth((s) => s.user)!;
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const sessions = useFinance((s) => s.sessions);
  const endSession = useFinance((s) => s.endSession);
  const endOthers = useFinance((s) => s.endOtherSessions);
  const navigate = useNavigate();
  const [confirmAll, setConfirmAll] = useState(false);
  const { register, handleSubmit, formState, reset, watch, setError } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { current: '', next: '', confirm: '' } });
  const canChange = user.provider === 'password';

  const onSubmit = async (v: Values) => {
    try {
      await authService.changePassword(user.id, v.current, v.next);
      reset();
      toast.success(t('Senha alterada com sucesso'));
      notifyUser({ kind: 'security', title: t('Senha alterada'), body: t('Sua senha foi alterada. Se não foi você, contate o suporte imediatamente.'), href: '/app/seguranca' });
    } catch (e) {
      setError('current', { message: e instanceof AuthError ? e.message : t('Não foi possível alterar a senha') });
    }
  };

  const DeviceIcon = (d: string) => (d === 'Celular' ? Smartphone : d === 'Tablet' ? Tablet : Monitor);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t('Segurança')} description={t('Proteja sua conta e controle onde você está conectado.')} />

      <Card>
        <CardHeader title={t('Dispositivos conectados')} icon={<ShieldCheck />} description={t('Sessões ativas na sua conta')} action={sessions.length > 1 && <Button size="sm" variant="secondary" onClick={() => setConfirmAll(true)}>{t('Encerrar outras')}</Button>} />
        <CardBody>
          <ul className="divide-y divide-border">
            {sessions.map((s) => {
              const I = DeviceIcon(s.device);
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted"><I className="size-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {s.browser} · {s.os}
                      {s.current && <Badge tone="success">{t('Este dispositivo')}</Badge>}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">{s.location} · IP {s.ip} · {s.current ? t('ativo agora') : t('ativo {quando}', { quando: timeAgo(s.lastActive) })}</p>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => { endSession(s.id); toast.success(t('Sessão encerrada'), { description: `${s.browser} · ${s.os}` }); }}>
                      {t('Encerrar')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {session && (
            <p className="mt-3 rounded-lg bg-surface-2/70 px-3 py-2 text-xs text-fg-subtle">
              {t('Sessão atual iniciada em {inicio} · expira em {fim}', { inicio: formatDateTime(session.createdAt), fim: formatDateTime(session.expiresAt) })} {session.remember ? t('(lembrar acesso ativo)') : t('(encerra ao fechar o navegador)')}.
            </p>
          )}
        </CardBody>
      </Card>

      <BiometricSettings />

      <Card>
        <CardHeader title={t('Alterar senha')} icon={<KeyRound />} />
        <CardBody>
          {canChange ? (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label={t('Senha atual')} error={formState.errors.current?.message} className="sm:col-span-2">{(p) => <PasswordInput {...p} {...register('current')} autoComplete="current-password" />}</Field>
              <Field label={t('Nova senha')} error={formState.errors.next?.message}>{(p) => <div><PasswordInput {...p} {...register('next')} autoComplete="new-password" /><StrengthMeter value={watch('next')} /></div>}</Field>
              <Field label={t('Confirmar nova senha')} error={formState.errors.confirm?.message}>{(p) => <PasswordInput {...p} {...register('confirm')} autoComplete="new-password" />}</Field>
              <div className="sm:col-span-2"><Button type="submit" loading={formState.isSubmitting}>{t('Atualizar senha')}</Button></div>
            </form>
          ) : (
            <p className="text-sm text-fg-subtle">{user.provider === 'demo' ? t('Você entrou com a conta de demonstração — a senha é gerenciada pelo provedor.') : t('Você entrou com {provedor} — a senha é gerenciada pelo provedor.', { provedor: user.provider === 'google' ? 'Google' : 'Apple' })}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('Boas práticas')} />
        <CardBody>
          <ul className="space-y-2 text-sm text-fg-muted">
            <li>• {t('A Nexora nunca pede sua senha por e-mail, SMS ou telefone.')}</li>
            <li>• {t('Nunca armazenamos número completo de cartão, CVV ou senhas bancárias.')}</li>
            <li>• {t('Encerre sessões em dispositivos que você não reconhece.')}</li>
            <li>• {t('Use uma senha exclusiva, com 12+ caracteres.')}</li>
          </ul>
          <Button variant="danger" className="mt-5" leftIcon={<LogOut className="size-4" />} onClick={() => { signOut(); navigate('/entrar'); }}>{t('Sair deste dispositivo')}</Button>
        </CardBody>
      </Card>

      <ConfirmDialog open={confirmAll} onClose={() => setConfirmAll(false)} title={t('Encerrar outras sessões?')} description={t('Todos os outros dispositivos serão desconectados.')} confirmLabel={t('Encerrar')} onConfirm={() => { endOthers(); toast.success(t('Outras sessões encerradas')); }} />
    </div>
  );
}
