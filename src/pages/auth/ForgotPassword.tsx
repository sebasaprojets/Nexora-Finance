import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, MailCheck, Mail } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { authService } from '@/services/auth';
import { t } from '@/i18n';

const schema = z.object({ email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido') });

export default function ForgotPassword() {
  const [sent, setSent] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  return (
    <AuthLayout
      title={t('Recuperar senha')}
      subtitle={t('Enviaremos um link para você criar uma nova senha.')}
      footer={
        <Link to="/entrar" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" /> {t('Voltar para o login')}
        </Link>
      }
    >
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} role="status" className="card p-6 text-center">
          <MailCheck className="mx-auto size-10 text-success" aria-hidden />
          <p className="mt-3 font-medium">{t('Verifique sua caixa de entrada')}</p>
          <p className="mt-1 text-sm text-fg-subtle">{t('Se houver uma conta para')} <strong className="text-fg">{sent}</strong>{t(', você receberá as instruções em instantes.')}</p>
        </motion.div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(async ({ email }) => {
            const r = await authService.requestPasswordReset(email);
            setSent(r.email);
          })}
        >
          <Field label={t('E-mail')} error={formState.errors.email?.message}>
            {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" leftIcon={<Mail />} placeholder={t('voce@email.com')} />}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
            {t('Enviar link de recuperação')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
