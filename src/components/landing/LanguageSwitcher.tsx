import { Check, Globe } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { LANGS, useLang } from '@/i18n/lang';
import { cn } from '@/lib/cn';

/** Seletor de idioma (Português · English · Español). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const current = LANGS.find((l) => l.code === lang)!;
  return (
    <Dropdown
      label="Idioma / Language / Idioma"
      trigger={(p) => (
        <button
          type="button"
          aria-label={`Idioma: ${current.label}. Mudar idioma / Change language`}
          className={cn('inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg', className)}
          {...p}
        >
          <Globe className="size-[18px]" aria-hidden />
          {current.short}
        </button>
      )}
      items={LANGS.map((l) => ({
        label: `${l.flag}  ${l.label}`,
        icon: l.code === lang ? <Check className="text-primary" /> : <span className="inline-block size-4" />,
        onSelect: () => setLang(l.code),
      }))}
    />
  );
}
