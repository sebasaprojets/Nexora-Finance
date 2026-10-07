import { useCallback } from 'react';
import { formatMoney, MASK, type MoneyOptions } from '@/lib/format';
import { useSettings } from '@/store/settings';

/** Formatador de moeda conectado às preferências (moeda e "ocultar valores"). */
export function useMoney() {
  const currency = useSettings((s) => s.currency);
  const hidden = useSettings((s) => s.hideValues);
  return useCallback(
    (value: number, opts: Omit<MoneyOptions, 'currency'> & { ignoreHidden?: boolean } = {}) =>
      hidden && !opts.ignoreHidden ? `${formatMoney(0, { currency }).replace(/[\d.,\s]+/g, '').trim()} ${MASK}` : formatMoney(value, { ...opts, currency }),
    [currency, hidden],
  );
}
