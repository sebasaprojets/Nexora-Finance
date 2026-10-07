import { create } from 'zustand';
import type { User } from '@/types';
import { authService, type Session } from '@/services/auth';
import { cloudEnabled } from '@/services/cloud';

interface AuthState {
  user: User | null;
  session: Session | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  init: () => void;
  setAuth: (r: { user: User; session: Session }) => void;
  updateUser: (patch: Partial<User>) => void;
  /** Recarrega o perfil do servidor (ex.: após o pagamento do plano). */
  refreshUser: () => Promise<void>;
  signOut: () => void;
}

let started = false;

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  status: 'loading',
  init: () => {
    if (started) return;
    started = true;
    void authService.restore().then((r) =>
      set(r ? { user: r.user, session: r.session, status: 'authenticated' } : { user: null, session: null, status: 'anonymous' }),
    );
    if (cloudEnabled)
      void import('@/services/cloudAuth').then(({ cloudAuth }) =>
        cloudAuth.onChange((r) => {
          const cur = get();
          if (r && cur.user?.id !== r.user.id) set({ user: r.user, session: r.session, status: 'authenticated' });
          // Sessão encerrada fora do app (expirou/revogada) — a demonstração local não é afetada.
          if (!r && cur.user && authService.isCloudUser(cur.user.id)) set({ user: null, session: null, status: 'anonymous' });
        }),
      );
  },
  setAuth: ({ user, session }) => set({ user, session, status: 'authenticated' }),
  updateUser: (patch) => {
    const u = get().user;
    if (!u) return;
    set({ user: authService.updateUser(u.id, patch, u) });
  },
  refreshUser: async () => {
    const u = get().user;
    if (!u || !authService.isCloudUser(u.id)) return;
    const { cloudAuth } = await import('@/services/cloudAuth');
    const fresh = await cloudAuth.refreshProfile();
    if (fresh) set({ user: { ...fresh, onboarded: fresh.onboarded || u.onboarded } });
  },
  signOut: () => {
    const id = get().user?.id;
    set({ user: null, session: null, status: 'anonymous' });
    void authService.signOut(id);
  },
}));
