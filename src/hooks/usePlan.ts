import { useCallback } from 'react';
import { t } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { useUI } from '@/store/ui';
import { FREE_LIMITS, hasPro, limitReached, type LimitedResource } from '@/lib/plans';

// Frase inteira por recurso (gênero/plural variam entre idiomas). Traduzida na hora de exibir.
const LIMIT_MSG: Record<LimitedResource, string> = {
  accounts: 'O plano Grátis inclui até {n} contas. Seja Pro para adicionar quantas quiser.',
  cards: 'O plano Grátis inclui até {n} cartões. Seja Pro para adicionar quantos quiser.',
  goals: 'O plano Grátis inclui até {n} metas. Seja Pro para adicionar quantas quiser.',
  budgets: 'O plano Grátis inclui até {n} orçamentos. Seja Pro para adicionar quantos quiser.',
};

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
      openUpgrade(t(LIMIT_MSG[resource], { n: FREE_LIMITS[resource] }));
      return false;
    },
    [user, openUpgrade],
  );

  const canUse = useCallback(
    (feature: string) => {
      if (pro) return true;
      openUpgrade(t('{feature} faz parte do plano Pro.', { feature: t(feature) }));
      return false;
    },
    [pro, openUpgrade],
  );

  return { pro, canCreate, canUse };
}
