import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, BarChart3, House, Plus, User, TrendingDown, TrendingUp, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUI } from '@/store/ui';

const items = [
  { to: '/app', label: 'Início', icon: House },
  { to: '/app/transacoes', label: 'Transações', icon: ArrowLeftRight },
  null,
  { to: '/app/analises', label: 'Análises', icon: BarChart3 },
  { to: '/app/perfil', label: 'Perfil', icon: User },
] as const;

/** Navegação inferior (mobile) com botão central "+" para lançamento rápido. */
export function BottomNav() {
  const open = useUI((s) => s.quickAddOpen);
  const setOpen = useUI((s) => s.setQuickAddOpen);
  const openTx = useUI((s) => s.openTransaction);

  const actions = [
    { label: 'Receita', icon: TrendingUp, type: 'income' as const, color: 'var(--series-income)' },
    { label: 'Despesa', icon: TrendingDown, type: 'expense' as const, color: 'var(--series-expense)' },
    { label: 'Transferência', icon: Repeat2, type: 'transfer' as const, color: 'var(--series-net)' },
  ];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-50 flex justify-center gap-3 px-4 lg:hidden"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{ show: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
            role="menu"
            aria-label="Adicionar"
          >
            {actions.map((a) => (
              <motion.button
                key={a.type}
                role="menuitem"
                variants={{ hidden: { opacity: 0, y: 16, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1 } }}
                onClick={() => openTx({ type: a.type })}
                className="glass flex w-28 flex-col items-center gap-2 rounded-2xl py-4 text-sm font-medium shadow-lg"
              >
                <span className="grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${a.color} 18%, transparent)`, color: a.color }}>
                  <a.icon className="size-5" aria-hidden />
                </span>
                {a.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <nav
        data-tour="nav"
        aria-label="Navegação inferior"
        className="glass fixed inset-x-0 bottom-0 z-50 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {items.map((it) =>
            it === null ? (
              <li key="add" className="flex justify-center">
                <button
                  onClick={() => setOpen(!open)}
                  aria-expanded={open}
                  aria-label={open ? 'Fechar menu de adição' : 'Adicionar transação'}
                  data-tour="add-transaction"
                  className="grid size-12 -translate-y-3 place-items-center rounded-2xl bg-primary text-primary-fg shadow-[0_10px_30px_-8px_var(--primary)] transition-transform active:scale-95"
                >
                  <Plus className={cn('size-6 transition-transform duration-200', open && 'rotate-45')} aria-hidden />
                </button>
              </li>
            ) : (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.to === '/app'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn('flex flex-col items-center gap-1 text-[10.5px] font-medium transition-colors', isActive ? 'text-primary' : 'text-fg-subtle')
                  }
                >
                  <it.icon className="size-5" aria-hidden />
                  {it.label}
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>
    </>
  );
}
