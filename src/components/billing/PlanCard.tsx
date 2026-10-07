import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Sparkles } from 'lucide-react';
import { t } from '@/i18n';
import { useAuth } from '@/store/auth';
import { billingEnabled, hasPro } from '@/lib/plans';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

/** Situação do plano + atalho para melhorar (menu lateral e tela "Mais"). */
export function PlanCard({ compact, className }: { compact?: boolean; className?: string }) {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  const demo = user.provider === 'demo';
  const pro = billingEnabled && hasPro(user) && !demo;

  let title: string;
  let text: string;
  let cta: string;
  if (demo) {
    title = t('Modo demonstração');
    text = t('Crie sua conta para salvar seus dados.');
    cta = t('Ver planos');
  } else if (!billingEnabled) {
    title = t('Beta · tudo liberado');
    text = t('Você usa todos os recursos Pro de graça durante o beta.');
    cta = t('Ver planos');
  } else if (pro) {
    title = user.founder ? t('Pro · Fundador') : t('Plano Pro');
    text =
      user.planStatus === 'cancelled' && user.planRenewsAt
        ? t('Cancelado · Pro até {date}', { date: formatDate(user.planRenewsAt.slice(0, 10)) })
        : user.planRenewsAt
          ? t('Renova em {date}', { date: formatDate(user.planRenewsAt.slice(0, 10)) })
          : t('Assinatura ativa');
    cta = t('Gerenciar');
  } else {
    title = t('Plano Grátis');
    text = t('Desbloqueie tudo ilimitado e relatórios em PDF.');
    cta = t('Seja Pro');
  }
  const highlight = billingEnabled && !pro && !demo;

  return (
    <Link
      to="/app/plano"
      aria-label={`${title}. ${cta}`}
      className={cn(
        'group block rounded-xl border p-3.5 transition-colors',
        highlight ? 'border-primary/50 bg-primary-soft/50 hover:bg-primary-soft' : 'border-border bg-surface hover:border-border-strong',
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', pro ? 'bg-primary text-primary-fg' : 'bg-primary-soft text-primary')}>
          {pro || highlight ? <Crown className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{title}</p>
          {!compact && <p className="mt-0.5 text-xs text-fg-subtle">{text}</p>}
        </div>
        <span className={cn('flex shrink-0 items-center gap-1 text-xs font-semibold', highlight ? 'text-primary' : 'text-fg-subtle group-hover:text-fg')}>
          {cta} <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
      {compact && <p className="mt-2 text-xs text-fg-subtle">{text}</p>}
    </Link>
  );
}
