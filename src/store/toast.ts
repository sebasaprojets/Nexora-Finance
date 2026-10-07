import { create } from 'zustand';
import { uid } from '@/lib/id';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid('toast');
    const toast: Toast = { duration: 4200, ...t, id };
    set((s) => ({ toasts: [...s.toasts.slice(-3), toast] }));
    if (toast.duration > 0) setTimeout(() => useToasts.getState().dismiss(id), toast.duration);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

type Opts = { description?: string; action?: Toast['action']; duration?: number };
export const toast = {
  success: (title: string, o: Opts = {}) => useToasts.getState().push({ tone: 'success', title, ...o }),
  error: (title: string, o: Opts = {}) => useToasts.getState().push({ tone: 'error', title, ...o }),
  info: (title: string, o: Opts = {}) => useToasts.getState().push({ tone: 'info', title, ...o }),
  warning: (title: string, o: Opts = {}) => useToasts.getState().push({ tone: 'warning', title, ...o }),
};
