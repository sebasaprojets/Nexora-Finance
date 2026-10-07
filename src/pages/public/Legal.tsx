import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

const PRIVACY = {
  title: 'Política de Privacidade',
  updated: '07/10/2026',
  sections: [
    ['1. Quem somos', 'A Nexora Finance (“Nexora”) é uma plataforma de organização financeira pessoal e empresarial. Esta política explica como tratamos dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).'],
    ['2. Dados que coletamos', 'Dados de cadastro (nome, e-mail, foto opcional); dados financeiros que você registra (contas, transações, cartões sem número completo, metas, orçamentos, dívidas, investimentos e assinaturas); dados técnicos de sessão (navegador, sistema operacional, data de acesso e IP aproximado) para segurança. Não coletamos senhas bancárias, número completo de cartão ou código de segurança (CVV).'],
    ['3. Finalidades e bases legais', 'Execução de contrato (oferecer as funcionalidades da plataforma), legítimo interesse (segurança, prevenção a fraudes e melhoria do serviço) e consentimento (notificações push e comunicações opcionais), que pode ser revogado a qualquer momento.'],
    ['4. Compartilhamento', 'Não vendemos dados. Podemos compartilhar com operadores necessários à prestação do serviço (hospedagem, envio de e-mails e notificações), sob contrato e com as mesmas garantias de proteção, ou por obrigação legal.'],
    ['5. Armazenamento e segurança', 'Dados trafegam por HTTPS e são armazenados com controles de acesso e criptografia em repouso. No modo local (sem conta em nuvem), os dados ficam apenas no seu navegador. Sessões podem ser encerradas a qualquer momento em “Segurança”.'],
    ['6. Seus direitos', 'Você pode confirmar a existência de tratamento, acessar, corrigir, portar (exportação em JSON), anonimizar ou eliminar seus dados, além de revogar consentimentos — diretamente em “Privacidade e dados” ou pelo canal do encarregado.'],
    ['7. Retenção', 'Mantemos os dados enquanto sua conta estiver ativa. Após a exclusão, os dados são eliminados, salvo quando houver obrigação legal de guarda.'],
    ['8. Encarregado (DPO)', 'Para exercer seus direitos ou tirar dúvidas, contate o encarregado de dados pelo canal oficial informado no aplicativo.'],
  ],
};

const TERMS = {
  title: 'Termos de Uso',
  updated: '07/10/2026',
  sections: [
    ['1. Aceite', 'Ao criar uma conta ou usar a Nexora você concorda com estes termos e com a Política de Privacidade.'],
    ['2. O serviço', 'A Nexora é uma ferramenta de organização e análise financeira. Não é instituição financeira, não movimenta dinheiro e não oferece crédito.'],
    ['3. Informações financeiras', 'Análises, indicadores, score de saúde financeira e conteúdos sobre investimentos têm caráter informativo e educacional. Não constituem recomendação de investimento, consultoria ou garantia de resultado. O score Nexora não é score de crédito.'],
    ['4. Responsabilidades do usuário', 'Você é responsável pela veracidade dos dados registrados, pela guarda da sua senha e pelo uso adequado da plataforma.'],
    ['5. Disponibilidade', 'Empregamos esforços para manter o serviço disponível e seguro, mas podem ocorrer interrupções para manutenção ou por fatores externos.'],
    ['6. Planos', 'Funcionalidades podem variar entre os planos Gratuito, Pro e Business. Alterações de preço serão comunicadas com antecedência.'],
    ['7. Encerramento', 'Você pode excluir sua conta a qualquer momento. Podemos suspender contas que violem estes termos.'],
    ['8. Foro', 'Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do consumidor.'],
  ],
};

export default function Legal({ doc }: { doc: 'privacy' | 'terms' }) {
  const d = doc === 'privacy' ? PRIVACY : TERMS;
  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Nexora — início"><Logo /></Link>
          <button onClick={() => (history.length > 1 ? history.back() : location.assign(import.meta.env.BASE_URL))} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
            <ArrowLeft className="size-4" /> Voltar
          </button>
        </div>
        <article className="mt-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{d.title}</h1>
          <p className="mt-2 text-sm text-fg-subtle">Última atualização: {d.updated}</p>
          <div className="mt-10 space-y-8">
            {d.sections.map(([h, p]) => (
              <section key={h}>
                <h2 className="font-display text-lg font-semibold">{h}</h2>
                <p className="mt-2 leading-relaxed text-fg-muted">{p}</p>
              </section>
            ))}
          </div>
          <p className="mt-12 rounded-xl border border-border bg-surface-2/60 p-4 text-xs text-fg-subtle">Documento-modelo. Revise com assessoria jurídica antes do lançamento comercial.</p>
        </article>
      </div>
    </div>
  );
}
