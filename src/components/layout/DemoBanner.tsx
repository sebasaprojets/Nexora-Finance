import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/store/auth';

/** Faixa exibida na conta de demonstração, convidando a criar a conta própria. */
export function DemoBanner() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();
  if (user?.provider !== 'demo') return null;
  return (
    <div role="note" className="flex items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-primary-soft px-4 py-2 text-center text-xs text-fg-muted">
      <span className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span>
          <strong className="text-fg">{t('Modo demonstração')}</strong>
          <span className="hidden sm:inline"> — {t('dados fictícios para você explorar a Nexora.')}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          signOut();
          // Depois que a proteção de rota redireciona (sessão encerrada), segue para o cadastro.
          setTimeout(() => navigate('/cadastro', { replace: true }), 0);
        }}
        className="shrink-0 rounded-full bg-primary px-3 py-1 font-semibold text-primary-fg hover:bg-primary-hover"
      >
        {t('Criar minha conta')}
      </button>
    </div>
  );
}
