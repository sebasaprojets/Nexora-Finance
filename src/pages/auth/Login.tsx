import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Mail, Smartphone } from 'lucide-react';
import { cloudEnabled } from '@/services/cloud';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Divider, SocialButtons } from '@/components/common/SocialButtons';
import { BiometricLogin } from '@/components/common/BiometricLogin';
import { authService, AuthError } from '@/services/auth';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { t } from '@/i18n';

const schema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
  remember: z.boolean(),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', remember: true } });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      const r = await authService.signIn(v.email, v.password, v.remember);
      setAuth(r);
      toast.success(t('Bem-vindo de volta, {name}!', { name: r.user.name.split(' ')[0] }));
      navigate(r.user.onboarded ? (from ?? '/app') : '/onboarding', { replace: true });
    } catch (e) {
      setError(e instanceof AuthError ? e.message : t('Não foi possível entrar. Tente novamente.'));
    }
  };

  return (
    <AuthLayout
      title={t('Entrar na Nexora')}
      subtitle={t('Acesse seu painel financeiro.')}
      footer={
        <>
          {t('Ainda não tem conta?')}{' '}
          <Link to="/cadastro" className="font-medium text-primary hover:underline">
            {t('Criar conta grátis')}
          </Link>
        </>
      }
    >
      <BiometricLogin from={from} />
      <SocialButtons />
      <Divider label={t('ou entre com e-mail')} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </div>
        )}
        <Field label={t('E-mail')} error={formState.errors.email?.message}>
          {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" leftIcon={<Mail />} placeholder={t('voce@email.com')} />}
        </Field>
        <Field label={t('Senha')} error={formState.errors.password?.message}>
          {(p) => <PasswordInput {...p} {...register('password')} autoComplete="current-password" placeholder="••••••••" />}
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-fg-muted">
            <input type="checkbox" {...register('remember')} className="size-4 rounded accent-[var(--primary)]" /> {t('Lembrar acesso')}
          </label>
          <Link to="/recuperar-senha" className="font-medium text-primary hover:underline">
            {t('Esqueci minha senha')}
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          {t('Entrar')}
        </Button>
        {!cloudEnabled && (
          <p className="flex items-start gap-2 rounded-xl bg-surface-2/70 px-3 py-2.5 text-xs text-fg-subtle">
            <Smartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t('Versão atual: sua conta e seus dados ficam salvos neste aparelho e navegador. Se você criou a conta em outro aparelho, entre por lá — a sincronização entre dispositivos chega em breve.')}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
