import { useMemo } from 'react';
import { useFinance } from '@/store/finance';

/** Mapas id → entidade para renderizar listas sem buscas O(n²). */
export function useLookups() {
  const categories = useFinance((s) => s.categories);
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  return useMemo(
    () => ({
      category: new Map(categories.map((c) => [c.id, c])),
      account: new Map(accounts.map((a) => [a.id, a])),
      card: new Map(cards.map((c) => [c.id, c])),
    }),
    [categories, accounts, cards],
  );
}
