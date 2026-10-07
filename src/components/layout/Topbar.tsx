import { Link, useNavigate } from 'react-router-dom';
import { Bell, Eye, EyeOff, LogOut, Plus, Search, Settings, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Avatar } from '@/components/common/Avatar';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from './ThemeToggle';
import { useUI } from '@/store/ui';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useFinance } from '@/store/finance';

export function Topbar() {
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const openTx = useUI((s) => s.openTransaction);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const hide = useSettings((s) => s.hideValues);
  const toggleHide = useSettings((s) => s.toggleHideValues);
  const unread = useFinance((s) => s.notifications.filter((n) => !n.read).length);
  const navigate = useNavigate();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        <Link to="/app" className="lg:hidden" aria-label="Nexora — início">
          <Logo compact />
        </Link>
        <button
          onClick={() => setCommandOpen(true)}
          className="ml-1 hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 px-3 text-sm text-fg-subtle transition-colors hover:border-border-strong sm:flex"
          aria-label="Abrir busca e comandos"
          data-tour="search"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Buscar ou executar comando…</span>
          <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-sans text-[11px]">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Buscar" onClick={() => setCommandOpen(true)}>
            <Search className="size-[18px]" />
          </Button>
          <Button data-tour="hide-values" variant="ghost" size="icon" aria-label={hide ? 'Mostrar valores' : 'Ocultar valores'} aria-pressed={hide} onClick={toggleHide}>
            {hide ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </Button>
          <ThemeToggle />
          <Link
            to="/app/notificacoes"
            className="relative grid size-10 place-items-center rounded-xl text-fg-muted hover:bg-surface-2 hover:text-fg"
            aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`}
          >
            <Bell className="size-[18px]" aria-hidden />
            {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-bg" aria-hidden />}
          </Link>
          <Button data-tour="add-transaction" className="ml-1 hidden lg:inline-flex" leftIcon={<Plus className="size-4" />} onClick={() => openTx({ type: 'expense' })}>
            Nova transação
          </Button>
          <Dropdown
            label="Menu da conta"
            trigger={(p) => (
              <button className="ml-1 rounded-full ring-offset-2 ring-offset-bg" aria-label="Menu da conta" {...p}>
                <Avatar name={user?.name ?? ''} src={user?.avatarUrl} />
              </button>
            )}
            items={[
              { label: 'Perfil', icon: <User />, onSelect: () => navigate('/app/perfil') },
              { label: 'Configurações', icon: <Settings />, onSelect: () => navigate('/app/configuracoes') },
              { label: 'Segurança', icon: <ShieldCheck />, onSelect: () => navigate('/app/seguranca') },
              {
                label: 'Sair',
                icon: <LogOut />,
                danger: true,
                onSelect: () => {
                  signOut();
                  navigate('/entrar');
                },
              },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
