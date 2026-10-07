import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronsLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { NAV_GROUPS, ACCOUNT_NAV, type NavItem } from '@/lib/navigation';
import { Logo, LogoMark } from '@/components/common/Logo';
import { useUI } from '@/store/ui';
import { useFinance } from '@/store/finance';

function Item({ item, collapsed, badge }: { item: NavItem; collapsed: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
          isActive ? 'text-fg' : 'text-fg-subtle hover:bg-surface-2/70 hover:text-fg-muted',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-lg border border-border bg-surface-2"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <Icon className={cn('relative size-[18px] shrink-0', isActive && 'text-primary')} aria-hidden />
          {!collapsed && <span className="relative truncate">{item.label}</span>}
          {!!badge && (
            <span className={cn('relative ml-auto rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-fg', collapsed && 'absolute top-1 right-1 ml-0')}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
          {!collapsed && item.shortcut && !badge && (
            <kbd className="relative ml-auto hidden rounded border border-border px-1 font-sans text-[10px] text-fg-subtle group-hover:inline">{item.shortcut}</kbd>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggle = useUI((s) => s.toggleSidebar);
  const unread = useFinance((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <aside
      data-tour="nav"
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-bg-elevated/60 backdrop-blur-xl transition-[width] duration-300 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
      aria-label="Navegação principal"
    >
      <div className={cn('flex h-16 items-center px-4', collapsed && 'justify-center px-0')}>
        {collapsed ? <LogoMark /> : <Logo />}
      </div>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            {!collapsed && <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-wider text-fg-subtle/80 uppercase">{g.label}</p>}
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <Item key={it.to} item={it} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
        <div>
          {!collapsed && <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-wider text-fg-subtle/80 uppercase">Conta</p>}
          <div className="space-y-0.5">
            {ACCOUNT_NAV.map((it) => (
              <Item key={it.to} item={it} collapsed={collapsed} badge={it.to === '/app/notificacoes' ? unread : undefined} />
            ))}
          </div>
        </div>
      </nav>
      <div className="space-y-2 p-3">
        {!collapsed && (
          <NavLink to="/app/assistente" className="holo group block rounded-xl border border-border p-3.5 transition-colors hover:border-border-strong">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden /> Nexora AI
            </div>
            <p className="mt-1 text-xs text-fg-subtle">Pergunte sobre seus gastos, metas e saldo.</p>
          </NavLink>
        )}
        <button
          onClick={toggle}
          className={cn('flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-xs text-fg-subtle hover:bg-surface-2 hover:text-fg', collapsed && 'justify-center')}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <ChevronsLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} aria-hidden />
          {!collapsed && 'Recolher'}
        </button>
      </div>
    </aside>
  );
}
