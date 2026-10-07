import { Monitor, Moon, Sun } from 'lucide-react';
import { t } from '@/i18n';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/store/settings';
import { useResolvedTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const set = useSettings((s) => s.set);
  const resolved = useResolvedTheme();
  return (
    <Dropdown
      label={t('Tema')}
      trigger={(p) => (
        <Button variant="ghost" size="icon" aria-label={t('Alterar tema')} {...p}>
          {resolved === 'dark' ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </Button>
      )}
      items={[
        { label: t('Escuro'), icon: <Moon />, onSelect: () => set({ theme: 'dark' }) },
        { label: t('Claro'), icon: <Sun />, onSelect: () => set({ theme: 'light' }) },
        { label: t('Sistema'), icon: <Monitor />, onSelect: () => set({ theme: 'system' }) },
      ]}
    />
  );
}
