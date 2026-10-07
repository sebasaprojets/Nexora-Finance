import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Mail, User } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { PasswordInput, StrengthMeter } from '@/components/common/PasswordInput';
import { Divider, SocialButtons } from '@/components/common/SocialButtons';
import { authService, AuthError } from '@/services/auth';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome').max(80, 'Nome muito longo'),
    email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
    password: z
      .string()
      .min(8, 'Use ao menos 8 caracteres')
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
      .regex(/\d/, 'Inclua ao menos um número'),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, 'Você precisa aceitar os termos para continuar'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não coincidem' });
type Values = z.infer<typeof schema>;

export default function Register() {
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();
  const { register, handleSubmit, formState, watch } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirm: '', terms: false },
  });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      const r = await authService.signUp(v.name, v.email, v.password);
      setAuth(r);
      toast.success('Conta criada com sucesso!', { description: 'Vamos personalizar sua experiência.' });
      navigate('/onboarding', { replace: true });
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Não foi possível criar a conta.');
    }
  };

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Comece grátis. Leva menos de um minuto."
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SocialButtons />
      <Divider label="ou cadastre-se com e-mail" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </div>
        )}
        <Field label="Nome" error={formState.errors.name?.message}>
          {(p) => <Input {...p} {...register('name')} autoComplete="name" leftIcon={<User />} placeholder="Seu nome" />}
        </Field>
        <Field label="E-mail" error={formState.errors.email?.message}>
          {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" leftIcon={<Mail />} placeholder="voce@email.com" />}
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          {(p) => (
            <div>
              <PasswordInput {...p} {...register('password')} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" />
              <StrengthMeter value={watch('password')} />
            </div>
          )}
        </Field>
        <Field label="Confirmar senha" error={formState.errors.confirm?.message}>
          {(p) => <PasswordInput {...p} {...register('confirm')} autoComplete="new-password" placeholder="Repita a senha" />}
        </Field>
        <div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-fg-muted">
            <input type="checkbox" {...register('terms')} className="mt-0.5 size-4 rounded accent-[var(--primary)]" aria-invalid={!!formState.errors.terms} />
            <span>
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" className="text-primary hover:underline">Termos de uso</Link> e a{' '}
              <Link to="/privacidade" target="_blank" className="text-primary hover:underline">Política de privacidade</Link>.
            </span>
          </label>
          {formState.errors.terms && <p role="alert" className="mt-1 text-xs text-danger">{formState.errors.terms.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
