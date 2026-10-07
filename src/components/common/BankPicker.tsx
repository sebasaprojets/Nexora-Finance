import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { SELECTABLE_BANKS, bankLogoUrl, type BankInfo } from '@/lib/banks';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';

const POPULAR = ['nubank', 'itau', 'bradesco', 'santander', 'bancodobrasil', 'caixa', 'inter', 'c6bank', 'picpay', 'mercadopago', 'btgpactual', 'xp'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Seletor visual de banco (com logos). `value` é o slug; vazio = outra instituição. */
export function BankPicker({ value, onChange, label: labelProp }: { value?: string; onChange: (bank: BankInfo | null) => void; label?: string }) {
  const label = labelProp ?? t('Banco ou instituição');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const term = norm(q.trim());
    if (term) return SELECTABLE_BANKS.filter((b) => norm(`${b.name} ${b.aliases.join(' ')}`).includes(term));
    const popular = POPULAR.map((s) => SELECTABLE_BANKS.find((b) => b.slug === s)!).filter(Boolean);
    const selected = value && !POPULAR.includes(value) ? SELECTABLE_BANKS.filter((b) => b.slug === value) : [];
    return [...selected, ...popular];
  }, [q, value]);

  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium text-fg-muted">{label}</legend>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Buscar banco (ex.: Sicredi, Neon, BTG)…')}
          aria-label={t('Buscar banco')}
          className="h-10 w-full rounded-xl border border-border bg-surface-2/60 pr-3 pl-9 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label={label}>
        {list.map((b) => {
          const on = value === b.slug;
          return (
            <button
              key={b.slug}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? null : b)}
              className={cn('relative flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition-colors', on ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-2')}
            >
              <img src={bankLogoUrl(b.slug)} alt="" loading="lazy" className="size-9 rounded-lg" />
              <span className="w-full truncate text-center text-fg-muted">{b.name}</span>
              {on && (
                <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-primary-fg" aria-hidden>
                  <Check className="size-3" />
                </span>
              )}
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-full py-3 text-center text-xs text-fg-subtle">{t('Nenhum banco encontrado. Digite o nome no campo “Instituição”.')}</p>}
      </div>
    </fieldset>
  );
}
