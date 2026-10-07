import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, GraduationCap, Mail, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { useSettings } from '@/store/settings';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { BUSINESS, whatsappLink } from '@/config/business';
import { cloudEnabled } from '@/services/cloud';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';

const FAQ = [
  ['Meus dados ficam salvos onde?', cloudEnabled ? 'Na nuvem, em servidores com criptografia, vinculados à sua conta. Você entra de qualquer aparelho com seu e-mail e senha.' : 'Nesta versão, no próprio aparelho e navegador em que você criou a conta.'],
  ['A Nexora acessa minha conta do banco?', 'Não. Você registra suas movimentações; nunca pedimos senha do banco, número completo do cartão ou CVV.'],
  ['Como registro um gasto rápido?', 'Toque no botão + ou escreva para a Nexora AI, por exemplo: “gastei 35 no mercado”. Ela sugere a categoria e você confirma.'],
  ['Como funciona a fatura do cartão?', 'Compras no cartão entram na fatura pelo dia de fechamento. Ao pagar, registre o pagamento da fatura para o saldo da conta ficar certo.'],
  ['Posso exportar ou apagar meus dados?', 'Sim. Em Privacidade e dados você baixa tudo em JSON ou exclui sua conta definitivamente.'],
  ['Como cancelo a assinatura?', 'Em Meu plano → Cancelar assinatura. Sem multa e sem fidelidade; o Pro segue até o fim do período pago.'],
];

/** Ajuda e suporte: contato direto, perguntas frequentes e tutoriais. */
export default function Help() {
  const [open, setOpen] = useState<number | null>(0);
  const user = useAuth((s) => s.user);
  const resetTutorials = useSettings((s) => s.resetTutorials);
  const wa = whatsappLink(t('Olá! Sou {name} e preciso de ajuda com a Nexora.', { name: user?.name ?? t('usuário') }));
  const mail = BUSINESS.supportEmail ? `mailto:${BUSINESS.supportEmail}?subject=${encodeURIComponent(t('Ajuda com a Nexora'))}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('Ajuda e suporte')} description={t('Tire dúvidas ou fale com a gente.')} />

      <div className="grid gap-3 sm:grid-cols-2">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="card flex items-center gap-3 p-5 transition-colors hover:border-border-strong">
            <span className="grid size-11 place-items-center rounded-xl bg-success-soft text-success"><MessageCircle className="size-5" aria-hidden /></span>
            <span><span className="block font-medium">WhatsApp</span><span className="text-sm text-fg-subtle">{t('Resposta em horário comercial')}</span></span>
          </a>
        )}
        {mail && (
          <a href={mail} className="card flex items-center gap-3 p-5 transition-colors hover:border-border-strong">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><Mail className="size-5" aria-hidden /></span>
            <span className="min-w-0"><span className="block font-medium">{t('E-mail')}</span><span className="block truncate text-sm text-fg-subtle">{BUSINESS.supportEmail}</span></span>
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            resetTutorials();
            toast.success(t('Tutoriais reativados'), { description: t('Eles aparecem de novo ao abrir cada página.') });
          }}
          className="card flex items-center gap-3 p-5 text-left transition-colors hover:border-border-strong"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-fg-muted"><GraduationCap className="size-5" aria-hidden /></span>
          <span><span className="block font-medium">{t('Rever tutoriais')}</span><span className="text-sm text-fg-subtle">{t('Mostra de novo o passo a passo')}</span></span>
        </button>
      </div>

      <Card className="divide-y divide-border">
        {FAQ.map(([q, a], i) => (
          <div key={q}>
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium">
              {t(q)}
              <ChevronDown className={cn('size-4 shrink-0 text-fg-subtle transition-transform', open === i && 'rotate-180')} aria-hidden />
            </button>
            {open === i && <p className="px-5 pb-4 text-sm text-fg-muted">{t(a)}</p>}
          </div>
        ))}
      </Card>

      <p className="text-center text-xs text-fg-subtle">
        {t('Leia também os')} <Link to="/termos" className="underline">{t('Termos de uso')}</Link> {t('e a')} <Link to="/privacidade" className="underline">{t('Política de privacidade')}</Link>.
      </p>
    </div>
  );
}
