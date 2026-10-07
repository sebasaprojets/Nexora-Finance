import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NotificationPreferences, Settings } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  currency: 'BRL',
  language: 'pt-BR',
  hideValues: false,
  reducedMotion: 'system',
  notifications: {
    push: false,
    email: true,
    billDue: true,
    invoices: true,
    goals: true,
    budgets: true,
    transactions: true,
    security: true,
  },
};

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  setNotifications: (patch: Partial<NotificationPreferences>) => void;
  toggleHideValues: () => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      setNotifications: (patch) => set((s) => ({ notifications: { ...s.notifications, ...patch } })),
      toggleHideValues: () => set((s) => ({ hideValues: !s.hideValues })),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'nexora:settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _a, setNotifications: _b, toggleHideValues: _c, reset: _d, ...s }) => s,
    },
  ),
);
