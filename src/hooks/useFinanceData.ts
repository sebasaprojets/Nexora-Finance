import { useShallow } from 'zustand/react/shallow';
import { selectData, useFinance } from '@/store/finance';

/** Dados financeiros do usuário (referência estável enquanto nada muda). */
export function useFinanceData() {
  return useFinance(useShallow(selectData));
}
