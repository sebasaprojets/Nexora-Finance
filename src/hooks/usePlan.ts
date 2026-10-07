import { useCallback } from 'react';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { useUI } from '@/store/ui';
import { FREE_LIMITS, aiUsage, hasPro, limitReached, type LimitedResource, type ProFeature } from '@/lib/plans';

/** Quanto do recurso o usuário já usa (para os limites do plano Grátis). */
export function resourceCount(resource: LimitedResource, uid?: string): number {
  const s = useFinance.getState();
  switch (resource) {
    case 'accounts':
      return s.accounts.filter((a) => !a.archived).length;
    case 'categories':
      return s.categories.filter((c) => !c.system).length;
    case 'subscriptions':
      return s.subscriptions.filter((x) => x.active).length;
    case 'debts':
      return s.debts.filter((d) => d.status !== 'paid').length;
    case 'ai':
      return aiUsage(uid);
    default:
      return s[resource].length;
  }
}

/**
 * Acesso ao plano.
 * - `canCreate('cards')`: false (e abre o "Seja Pro") se o limite grátis acabou.
 * - `canUse('export')`: false (e abre o "Seja Pro") para recursos exclusivos do Pro.
 */
export function usePlan() {
  const user = useAuth((s) => s.user);
  const openUpgrade = useUI((s) => s.openUpgrade);
  // Re-renderiza quando os dados mudam, para os contadores ficarem certos.
  useFinance((s) => s.updatedAt);
  const pro = hasPro(user);

  const usage = useCallback(
    (resource: LimitedResource) => ({ used: resourceCount(resource, user?.id), limit: FREE_LIMITS[resource] }),
    [user],
  );

  const canCreate = useCallback(
    (resource: LimitedResource) => {
      if (!limitReached(user, resource, resourceCount(resource, user?.id))) return true;
      openUpgrade({ resource });
      return false;
    },
    [user, openUpgrade],
  );

  const canUse = useCallback(
    (feature: ProFeature) => {
      if (pro) return true;
      openUpgrade({ feature });
      return false;
    },
    [pro, openUpgrade],
  );

  return { pro, usage, canCreate, canUse };
}
