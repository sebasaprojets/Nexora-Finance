import { useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { exportTables, type ExportFormat, type ExportTable } from '@/lib/export';
import { toast } from '@/store/toast';
import { t } from '@/i18n';

export function ExportMenu({ getTables, title, label, size = 'md' }: { getTables: () => ExportTable[]; title?: string; label?: string; size?: 'sm' | 'md' }) {
  const [busy, setBusy] = useState(false);
  const { canUse } = usePlan();
  const run = async (f: ExportFormat) => {
    if (f !== 'csv' && !canUse(t('A exportação em {formato}', { formato: f === 'pdf' ? 'PDF' : 'Excel' }))) return;
    setBusy(true);
    try {
      const tables = getTables();
      if (!tables.some((tb) => tb.rows.length)) {
        toast.warning(t('Nada para exportar'), { description: t('Não há linhas com os filtros atuais.') });
        return;
      }
      await exportTables(f, tables, title);
      toast.success(t('Arquivo {formato} gerado', { formato: f.toUpperCase() }));
    } catch (e) {
      console.error(e);
      toast.error(t('Falha ao exportar'), { description: t('Tente novamente.') });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dropdown
      label={t('Formatos de exportação')}
      trigger={(p) => (
        <Button data-tour="export" variant="secondary" size={size} loading={busy} leftIcon={<Download className="size-4" />} {...p}>
          {label ?? t('Exportar')}
        </Button>
      )}
      items={[
        { label: 'CSV', icon: <Sheet />, onSelect: () => run('csv') },
        { label: 'Excel (.xlsx)', icon: <FileSpreadsheet />, onSelect: () => run('xlsx') },
        { label: 'PDF', icon: <FileText />, onSelect: () => run('pdf') },
      ]}
    />
  );
}
