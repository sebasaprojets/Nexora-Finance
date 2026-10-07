import { useMemo, useState } from 'react';
import { periodFromPreset, previousPeriod, type Period, type PeriodPreset } from '@/lib/finance';
import { addDays, today } from '@/lib/dates';

export function usePeriod(initial: PeriodPreset = '30d') {
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [custom, setCustom] = useState<Period>({ from: addDays(today(), -29), to: today() });
  const period = useMemo(() => periodFromPreset(preset, today(), custom), [preset, custom]);
  const previous = useMemo(() => previousPeriod(period, preset), [period, preset]);
  return { preset, setPreset, custom, setCustom, period, previous };
}
