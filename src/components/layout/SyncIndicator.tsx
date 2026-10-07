import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { t } from '@/i18n';
import { Tooltip } from '@/components/ui/Tooltip';
import { useSyncStatus } from '@/services/cloud';
import { cn } from '@/lib/cn';

const LABEL = {
  syncing: 'Sincronizando com a nuvem…',
  saved: 'Tudo salvo na nuvem',
  offline: 'Sem internet — suas alterações ficam no aparelho e sobem quando voltar a conexão',
  error: 'Não foi possível salvar na nuvem agora. Tentaremos de novo automaticamente.',
} as const;

/** Ícone de nuvem na barra superior (só no modo nuvem). */
export function SyncIndicator() {
  const state = useSyncStatus((s) => s.state);
  if (state === 'local') return null;
  const Icon = state === 'syncing' ? RefreshCw : state === 'saved' ? Cloud : CloudOff;
  const problem = state === 'offline' || state === 'error';
  return (
    <Tooltip content={t(LABEL[state])} side="bottom" className={cn(!problem && 'hidden sm:inline-flex')}>
      <button type="button" aria-label={t(LABEL[state])} className={cn('grid size-10 place-items-center rounded-xl hover:bg-surface-2', problem ? 'text-warning' : 'text-fg-subtle')}>
        <Icon className={cn('size-[18px]', state === 'syncing' && 'animate-spin')} aria-hidden />
      </button>
    </Tooltip>
  );
}
