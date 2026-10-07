import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Moon, Repeat2, Search, Sun, TrendingDown, TrendingUp, EyeOff, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ALL_NAV } from '@/lib/navigation';
import { useUI } from '@/store/ui';
import { useFinance } from '@/store/finance';
import { useSettings } from '@/store/settings';
import { useAuth } from '@/store/auth';
import { formatDate } from '@/lib/dates';
import { useMoney } from '@/hooks/useMoney';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CommandPalette() {
  const open = useUI((s) => s.commandOpen);
  const setOpen = useUI((s) => s.setCommandOpen);
  const openTx = useUI((s) => s.openTransaction);
  const transactions = useFinance((s) => s.transactions);
  const setSettings = useSettings((s) => s.set);
  const toggleHide = useSettings((s) => s.toggleHideValues);
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();
  const money = useMoney();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const close = (fn: () => void) => () => {
      setOpen(false);
      fn();
    };
    return [
      { id: 'new-expense', group: 'Ações', label: 'Nova despesa', hint: 'D', icon: <TrendingDown />, keywords: 'gasto adicionar', run: close(() => openTx({ type: 'expense' })) },
      { id: 'new-income', group: 'Ações', label: 'Nova receita', hint: 'R', icon: <TrendingUp />, keywords: 'ganho entrada adicionar', run: close(() => openTx({ type: 'income' })) },
      { id: 'new-transfer', group: 'Ações', label: 'Nova transferência', icon: <Repeat2 />, keywords: 'mover pix', run: close(() => openTx({ type: 'transfer' })) },
      ...ALL_NAV.map((n) => ({
        id: n.to,
        group: 'Navegar',
        label: n.label,
        hint: n.shortcut,
        icon: <n.icon />,
        keywords: n.keywords,
        run: close(() => navigate(n.to)),
      })),
      { id: 'theme-dark', group: 'Preferências', label: 'Tema escuro', icon: <Moon />, run: close(() => setSettings({ theme: 'dark' })) },
      { id: 'theme-light', group: 'Preferências', label: 'Tema claro', icon: <Sun />, run: close(() => setSettings({ theme: 'light' })) },
      { id: 'hide', group: 'Preferências', label: 'Ocultar/mostrar valores', icon: <EyeOff />, keywords: 'privacidade', run: close(toggleHide) },
      { id: 'logout', group: 'Preferências', label: 'Sair da conta', icon: <LogOut />, keywords: 'logout', run: close(() => { signOut(); navigate('/entrar'); }) },
    ];
  }, [navigate, openTx, setOpen, setSettings, toggleHide, signOut]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const cmds = q ? commands.filter((c) => normalize(`${c.label} ${c.keywords ?? ''}`).includes(q)) : commands;
    const txs: Command[] =
      q.length >= 2
        ? transactions
            .filter((t) => normalize(t.description).includes(q))
            .slice(0, 6)
            .map((t) => ({
              id: t.id,
              group: 'Transações',
              label: t.description,
              hint: `${formatDate(t.date)} · ${money(t.amount)}`,
              icon: t.type === 'income' ? <TrendingUp /> : t.type === 'expense' ? <TrendingDown /> : <Repeat2 />,
              run: () => {
                setOpen(false);
                navigate(`/app/transacoes?busca=${encodeURIComponent(t.description)}`);
              },
            }))
        : [];
    return [...cmds, ...txs];
  }, [query, commands, transactions, money, navigate, setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[active]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  let lastGroup = '';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-overlay backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-lg"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 text-fg-subtle" aria-hidden />
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite um comando ou busque transações…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
                role="combobox"
                aria-expanded
                aria-controls="cmdk-list"
                aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
              />
              <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-fg-subtle">ESC</kbd>
            </div>
            <div ref={list} id="cmdk-list" role="listbox" className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && <p className="px-3 py-10 text-center text-sm text-fg-subtle">Nenhum resultado para “{query}”.</p>}
              {results.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                return (
                  <div key={`${c.group}-${c.id}`}>
                    {header && <p className="px-3 pt-3 pb-1.5 text-[11px] font-medium tracking-wider text-fg-subtle uppercase">{header}</p>}
                    <button
                      id={`cmd-${c.id}`}
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={c.run}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors [&>svg]:size-4',
                        i === active ? 'bg-surface-2 text-fg' : 'text-fg-muted',
                      )}
                    >
                      <span className="text-fg-subtle [&>svg]:size-4">{c.icon}</span>
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="text-xs text-fg-subtle">{c.hint}</span>}
                      {i === active && <CornerDownLeft className="size-3.5 text-fg-subtle" aria-hidden />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
