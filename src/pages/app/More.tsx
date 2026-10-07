import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Crown, LifeBuoy, Lock, LogOut, Moon, Settings, ShieldCheck, Sun, User } from 'lucide-react';
import { t } from '@/i18n';
import { Avatar } from '@/components/common/Avatar';
import { PlanCard } from '@/components/billing/PlanCard';
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useResolvedTheme } from '@/hooks/useTheme';
import { ALL_NAV } from '@/lib/navigation';

/** Telas que não cabem na barra inferior do celular. */
const SECTIONS = ['/app/contas', '/app/cartoes', '/app/metas', '/app/orcamentos', '/app/investimentos', '/app/dividas', '/app/assinaturas', '/app/calendario', '/app/relatorios', '/app/categorias', '/app/saude', '/app/assistente'];

/** Menu "Mais" do celular: plano, todas as telas e a conta, num lugar só. */
export default function More() {
  const user = useAuth((s) => s.user)!;
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();
  const theme = useResolvedTheme();
  const setSettings = useSettings((s) => s.set);
  const items = SECTIONS.map((to) => ALL_NAV.find((n) => n.to === to)!);

  const account = [
    { to: '/app/perfil', icon: User, label: t('Perfil') },
    { to: '/app/plano', icon: Crown, label: t('Meu plano') },
    { to: '/app/configuracoes', icon: Settings, label: t('Configurações') },
    { to: '/app/seguranca', icon: ShieldCheck, label: t('Segurança') },
    { to: '/app/privacidade', icon: Lock, label: t('Privacidade e dados') },
    { to: '/app/ajuda', icon: LifeBuoy, label: t('Ajuda e suporte') },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link to="/app/perfil" className="flex items-center gap-3">
        <Avatar name={user.name} src={user.avatarUrl} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{user.name}</p>
          <p className="truncate text-sm text-fg-subtle">{user.email}</p>
        </div>
        <ChevronRight className="size-5 text-fg-subtle" aria-hidden />
      </Link>

      <PlanCard />

      <section aria-label={t('Telas')}>
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className="card flex flex-col items-center gap-2 px-2 py-4 text-center transition-colors active:bg-surface-2">
              <it.icon className="size-5 text-primary" aria-hidden />
              <span className="text-[12px] leading-tight font-medium">{t(it.label)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card divide-y divide-border overflow-hidden" aria-label={t('Conta')}>
        {account.map((a) => (
          <Link key={a.to} to={a.to} className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium active:bg-surface-2">
            <a.icon className="size-[18px] text-fg-muted" aria-hidden />
            <span className="flex-1">{a.label}</span>
            <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium active:bg-surface-2"
        >
          {theme === 'dark' ? <Sun className="size-[18px] text-fg-muted" aria-hidden /> : <Moon className="size-[18px] text-fg-muted" aria-hidden />}
          <span className="flex-1">{theme === 'dark' ? t('Tema claro') : t('Tema escuro')}</span>
        </button>
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="flex-1 text-sm font-medium">{t('Idioma')}</span>
          <LanguageSwitcher />
        </div>
        <button
          type="button"
          onClick={() => {
            signOut();
            navigate('/entrar');
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-danger active:bg-danger-soft"
        >
          <LogOut className="size-[18px]" aria-hidden />
          {t('Sair')}
        </button>
      </section>
    </div>
  );
}
