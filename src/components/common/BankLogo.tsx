import { useState, type ReactNode } from 'react';
import { bankBySlug, bankLogoUrl, findBank } from '@/lib/banks';
import { cn } from '@/lib/cn';

const SIZES = { xs: 'size-6 rounded-md', sm: 'size-8 rounded-lg', md: 'size-10 rounded-xl', lg: 'size-12 rounded-2xl' } as const;

/**
 * Logo oficial do banco (reconhecido pelo slug salvo ou pelo nome da instituição/conta).
 * Sem banco reconhecido, mostra o `fallback` (ícone com a cor da conta).
 */
export function BankLogo({
  slug,
  texts = [],
  size = 'md',
  fallback,
  className,
}: {
  slug?: string;
  texts?: (string | undefined)[];
  size?: keyof typeof SIZES;
  fallback?: ReactNode;
  className?: string;
}) {
  const bank = bankBySlug(slug) ?? findBank(...texts);
  const [failed, setFailed] = useState(false);
  if (!bank || failed) return <>{fallback ?? null}</>;
  return (
    <img
      src={bankLogoUrl(bank.slug)}
      alt={bank.name}
      title={bank.name}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn('shrink-0 object-cover shadow-sm ring-1 ring-black/5', SIZES[size], className)}
    />
  );
}
