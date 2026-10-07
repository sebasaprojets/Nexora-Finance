import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordInput, StrengthMeter } from '@/components/common/PasswordInput';
import { cloudEnabled } from '@/services/cloud';
import { AuthError } from '@/services/auth';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { t } from '@/i18n';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo de 8 caracteres').regex(/[A-Za-z]/, 'Inclua letras').regex(/\d/, 'Inclua números'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não coincidem' });
type Values = z.infer<typeof schema>;

/** Destino do link "redefinir senha" enviado por e-mail (modo nuvem). */
export default function ResetPassword() {
  const status = useAuth((s) => s.status);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [waited, setWaited] = useState(false);
  const { register, handleSubmit, formState, watch } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });

  // O Supabase valida o link ao carregar; damos um instante antes de dizer que expirou.
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const invalid = !cloudEnabled || (waited && status !== 'authenticated');

  return (
    <AuthLayout
      title={t('Criar nova senha')}
      subtitle={t('Escolha uma senha forte que você não usa em outros sites.')}
      footer={
        <Link to="/entrar" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" /> {t('Voltar para o login')}
        </Link>
      }
    >
      {invalid ? (
        <div role="alert" className="card p-6 text-center text-sm text-fg-muted">
          {t('Este link expirou ou já foi usado.')}{' '}
          <Link to="/recuperar-senha" className="font-medium text-primary hover:underline">{t('Pedir um novo link')}</Link>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(async (v) => {
            setError(null);
            try {
              const { cloudAuth } = await import('@/services/cloudAuth');
              await cloudAuth.setPassword(v.password);
              toast.success(t('Senha alterada!'), { description: t('Use a nova senha nos próximos acessos.') });
              navigate('/app', { replace: true });
            } catch (e) {
              setError(e instanceof AuthError ? e.message : t('Não foi possível alterar a senha.'));
            }
          })}
        >
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </div>
          )}
          <Field label={t('Nova senha')} error={formState.errors.password?.message}>
            {(p) => (
              <div>
                <PasswordInput {...p} {...register('password')} autoComplete="new-password" />
                <StrengthMeter value={watch('password')} />
              </div>
            )}
          </Field>
          <Field label={t('Confirmar nova senha')} error={formState.errors.confirm?.message}>
            {(p) => <PasswordInput {...p} {...register('confirm')} autoComplete="new-password" />}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting || status === 'loading'}>
            {t('Salvar nova senha')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
