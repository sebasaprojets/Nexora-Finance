import { create } from 'zustand';
import type { User } from '@/types';
import { authService, type Session } from '@/services/auth';

interface AuthState {
  user: User | null;
  session: Session | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  init: () => void;
  setAuth: (r: { user: User; session: Session }) => void;
  updateUser: (patch: Partial<User>) => void;
  signOut: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  status: 'loading',
  init: () => {
    const r = authService.getSession();
    set(r ? { user: r.user, session: r.session, status: 'authenticated' } : { user: null, session: null, status: 'anonymous' });
  },
  setAuth: ({ user, session }) => set({ user, session, status: 'authenticated' }),
  updateUser: (patch) => {
    const u = get().user;
    if (!u) return;
    set({ user: authService.updateUser(u.id, patch) });
  },
  signOut: () => {
    authService.signOut();
    set({ user: null, session: null, status: 'anonymous' });
  },
}));
