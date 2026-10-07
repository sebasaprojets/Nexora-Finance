import { create } from 'zustand';
import type { Transaction, TransactionType } from '@/types';

export interface TransactionDraft {
  type: TransactionType;
  /** Edição de uma transação existente. */
  editing?: Transaction;
  defaults?: Partial<Transaction>;
}

interface UIState {
  txModal: TransactionDraft | null;
  commandOpen: boolean;
  quickAddOpen: boolean;
  sidebarCollapsed: boolean;
  openTransaction: (draft: TransactionDraft) => void;
  closeTransaction: () => void;
  setCommandOpen: (open: boolean) => void;
  setQuickAddOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUI = create<UIState>((set) => ({
  txModal: null,
  commandOpen: false,
  quickAddOpen: false,
  sidebarCollapsed: false,
  openTransaction: (draft) => set({ txModal: draft, quickAddOpen: false, commandOpen: false }),
  closeTransaction: () => set({ txModal: null }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
