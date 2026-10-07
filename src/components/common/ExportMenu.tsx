import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { exportTables, type ExportFormat, type ExportTable } from '@/lib/export';
import { toast } from '@/store/toast';

export function ExportMenu({ getTables, title, label = 'Exportar', size = 'md' }: { getTables: () => ExportTable[]; title?: string; label?: string; size?: 'sm' | 'md' }) {
  const [busy, setBusy] = useState(false);
  const run = async (f: ExportFormat) => {
    setBusy(true);
    try {
      const tables = getTables();
      if (!tables.some((t) => t.rows.length)) {
        toast.warning('Nada para exportar', { description: 'Não há linhas com os filtros atuais.' });
        return;
      }
      await exportTables(f, tables, title);
      toast.success(`Arquivo ${f.toUpperCase()} gerado`);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao exportar', { description: 'Tente novamente.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dropdown
      label="Formatos de exportação"
      trigger={(p) => (
        <Button data-tour="export" variant="secondary" size={size} loading={busy} leftIcon={<Download className="size-4" />} {...p}>
          {label}
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
