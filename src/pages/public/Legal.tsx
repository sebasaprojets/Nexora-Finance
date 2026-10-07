import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { BUSINESS } from '@/config/business';
import { formatDate } from '@/lib/dates';
import { t } from '@/i18n';

const who = () =>
  BUSINESS.legalName
    ? `${BUSINESS.legalName}${BUSINESS.cnpj ? t(', inscrita no CNPJ {cnpj}', { cnpj: BUSINESS.cnpj }) : ''}${BUSINESS.city ? (BUSINESS.cnpj ? t(', com sede em {city}', { city: BUSINESS.city }) : t(', de {city}', { city: BUSINESS.city })) : ''}`
    : t('a responsável pela Nexora Finance');
const contact = () =>
  [BUSINESS.supportEmail && t('e-mail {email}', { email: BUSINESS.supportEmail }), BUSINESS.whatsapp && `WhatsApp +${BUSINESS.whatsapp}`].filter(Boolean).join(` ${t('ou')} `) ||
  t('canal de suporte informado no aplicativo (Ajuda e suporte)');

const PRIVACY = () => ({
  title: t('Política de Privacidade'),
  updated: '2026-10-07',
  sections: [
    [t('1. Quem somos'), t('A Nexora Finance (“Nexora”) é um aplicativo de organização financeira operado por {who}, controladora dos dados pessoais tratados no serviço. Esta política explica como tratamos dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).', { who: who() })],
    [t('2. Dados que coletamos'), t('Cadastro: nome, e-mail e foto (opcional). Dados financeiros que você mesmo registra: contas, transações, cartões (apenas os 4 últimos dígitos), metas, orçamentos, dívidas, investimentos e assinaturas. Assinatura do plano Pro: situação da assinatura e identificador no Mercado Pago — os dados do seu cartão ficam só com o Mercado Pago. Lista do beta: nome e contato que você informar. Dados técnicos: navegador, sistema e horário de acesso, para segurança. Nunca pedimos senha do banco, número completo do cartão ou CVV.')],
    [t('3. Para que usamos (bases legais)'), t('Para prestar o serviço contratado (execução de contrato), manter a conta segura e melhorar o app (legítimo interesse), cobrar a assinatura e cumprir obrigações fiscais (obrigação legal) e enviar notificações ou contatos sobre o beta (consentimento, que você pode revogar a qualquer momento). Não usamos seus dados financeiros para publicidade e não vendemos dados.')],
    [t('4. Com quem compartilhamos'), t('Apenas com operadores necessários ao serviço, sob contrato: Supabase (banco de dados e autenticação), GitHub (hospedagem do site) e Mercado Pago (pagamentos). Alguns desses fornecedores podem armazenar dados fora do Brasil, com garantias contratuais adequadas (art. 33 da LGPD). Também podemos compartilhar dados por ordem judicial ou obrigação legal.')],
    [t('5. Segurança'), t('Os dados trafegam com criptografia (HTTPS), ficam armazenados com criptografia em repouso e com regras de acesso que permitem que cada usuário veja apenas os próprios dados. Senhas são guardadas apenas como hash. Você pode ativar o acesso por Face ID/biometria, que nunca sai do seu aparelho.')],
    [t('6. Armazenamento no aparelho'), t('Usamos o armazenamento local do navegador para manter você conectado, guardar preferências (tema, tutoriais) e uma cópia dos seus dados para funcionar offline. Não usamos cookies de publicidade ou rastreamento de terceiros.')],
    [t('7. Seus direitos'), t('Você pode confirmar o tratamento, acessar, corrigir, levar seus dados para outro serviço (exportação em JSON), eliminá-los e revogar consentimentos — diretamente em “Privacidade e dados” no app ou pelo nosso contato. A exclusão da conta apaga seus dados dos nossos servidores.')],
    [t('8. Por quanto tempo guardamos'), t('Enquanto sua conta existir. Ao excluí-la, os dados são apagados, exceto registros de pagamento que a lei obriga a manter (por exemplo, para fins fiscais).')],
    [t('9. Contato do encarregado'), t('Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale conosco pelo {contact}. Respondemos em até 15 dias.', { contact: contact() })],
  ],
});

const TERMS = () => ({
  title: t('Termos de Uso'),
  updated: '2026-10-07',
  sections: [
    [t('1. Aceite'), t('Estes termos regem o uso da Nexora Finance, operada por {who}. Ao criar uma conta você declara ter lido e aceito estes termos e a Política de Privacidade.', { who: who() })],
    [t('2. O que a Nexora é (e o que não é)'), t('A Nexora é uma ferramenta de organização e análise das finanças que você registra. Não é banco nem instituição financeira, não movimenta dinheiro, não concede crédito e não acessa suas contas bancárias.')],
    [t('3. Informações e análises'), t('Análises, indicadores, o score de saúde financeira, as respostas da Nexora AI e os conteúdos sobre investimentos são informativos e educacionais, calculados a partir dos dados que você registra. Não são recomendação de investimento, consultoria financeira ou garantia de resultado. O score Nexora não é score de crédito.')],
    [t('4. Sua conta'), t('Você é responsável pelos dados que registra, por manter sua senha em segredo e por avisar-nos em caso de uso indevido da sua conta. É preciso ter 18 anos ou mais (ou autorização do responsável legal).')],
    [t('5. Planos e pagamento'), t('O plano Grátis não tem custo. O plano Pro é uma assinatura mensal ou anual cobrada pelo Mercado Pago (Pix ou cartão), renovada automaticamente até você cancelar. Os preços vigentes aparecem na página de planos; qualquer reajuste será avisado com pelo menos 30 dias de antecedência e vale só a partir da renovação seguinte.')],
    [t('6. Cancelamento e reembolso'), t('Você pode cancelar a qualquer momento em “Meu plano”, sem multa. O acesso Pro continua até o fim do período já pago e não há novas cobranças. Direito de arrependimento: pedidos feitos em até 7 dias da primeira cobrança recebem reembolso integral (art. 49 do Código de Defesa do Consumidor).')],
    [t('7. Beta'), t('Recursos identificados como beta podem mudar ou ser descontinuados. Participantes do beta de fundadores mantêm o preço de fundador enquanto a assinatura permanecer ativa, sem interrupção.')],
    [t('8. Disponibilidade'), t('Trabalhamos para manter o serviço disponível e seguro, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros. Recomendamos exportar seus dados periodicamente.')],
    [t('9. Uso adequado'), t('É proibido usar a Nexora para fins ilegais, tentar acessar dados de outros usuários ou prejudicar o funcionamento do serviço. Contas que violarem estes termos podem ser suspensas.')],
    [t('10. Encerramento'), t('Você pode excluir sua conta quando quiser, em “Privacidade e dados”. Se encerrarmos o serviço, avisaremos com antecedência e permitiremos a exportação dos seus dados.')],
    [t('11. Contato e foro'), t('Dúvidas, reclamações ou pedidos de reembolso: {contact}. Aplica-se a legislação brasileira, com foro no domicílio do consumidor.', { contact: contact() })],
  ],
});

export default function Legal({ doc }: { doc: 'privacy' | 'terms' }) {
  const d = doc === 'privacy' ? PRIVACY() : TERMS();
  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label={t('Nexora — início')}><Logo /></Link>
          <button onClick={() => (history.length > 1 ? history.back() : location.assign(import.meta.env.BASE_URL))} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
            <ArrowLeft className="size-4" /> {t('Voltar')}
          </button>
        </div>
        <article className="mt-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{d.title}</h1>
          <p className="mt-2 text-sm text-fg-subtle">{t('Última atualização: {date}', { date: formatDate(d.updated) })}</p>
          <div className="mt-10 space-y-8">
            {d.sections.map(([h, p]) => (
              <section key={h}>
                <h2 className="font-display text-lg font-semibold">{h}</h2>
                <p className="mt-2 leading-relaxed text-fg-muted">{p}</p>
              </section>
            ))}
          </div>
          {!BUSINESS.legalName && (
            <p className="mt-12 rounded-xl border border-border bg-surface-2/60 p-4 text-xs text-fg-subtle">{t('Documento-modelo. Preencha os dados da empresa e revise com assessoria jurídica antes do lançamento comercial.')}</p>
          )}
        </article>
      </div>
    </div>
  );
}
