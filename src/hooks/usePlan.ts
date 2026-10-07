import { useCallback } from 'react';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { useUI } from '@/store/ui';
import { FREE_LIMITS, hasPro, limitReached, type LimitedResource } from '@/lib/plans';

const NAMES: Record<LimitedResource, string> = { accounts: 'contas', cards: 'cartões', goals: 'metas', budgets: 'orçamentos' };

function count(resource: LimitedResource) {
  const s = useFinance.getState();
  return resource === 'accounts' ? s.accounts.filter((a) => !a.archived).length : s[resource].length;
}

/** Acesso ao plano: `canCreate('cards')` devolve false e abre o "Seja Pro" se o limite grátis acabou. */
export function usePlan() {
  const user = useAuth((s) => s.user);
  const openUpgrade = useUI((s) => s.openUpgrade);
  const pro = hasPro(user);

  const canCreate = useCallback(
    (resource: LimitedResource) => {
      if (!limitReached(user, resource, count(resource))) return true;
      openUpgrade(`O plano Grátis inclui até ${FREE_LIMITS[resource]} ${NAMES[resource]}. Seja Pro para adicionar quantos quiser.`);
      return false;
    },
    [user, openUpgrade],
  );

  const canUse = useCallback(
    (feature: string) => {
      if (pro) return true;
      openUpgrade(`${feature} faz parte do plano Pro.`);
      return false;
    },
    [pro, openUpgrade],
  );

  return { pro, canCreate, canUse };
}
