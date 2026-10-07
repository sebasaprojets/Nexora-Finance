import { useMemo, useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { CheckSquare, FileSpreadsheet, FileText, Sheet, Square } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PeriodFilter } from '@/components/common/PeriodFilter';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useFinanceData } from '@/hooks/useFinanceData';
import { usePeriod } from '@/hooks/usePeriod';
import { buildReport, REPORTS, type ReportKind } from '@/lib/reports';
import { exportTables, type ExportFormat, type ExportColumn } from '@/lib/export';
import { formatDate } from '@/lib/dates';
import { formatMoney, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toast } from '@/store/toast';
import { t } from '@/i18n';

function cell(v: string | number | null | undefined, c: ExportColumn) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return c.type === 'money' ? formatMoney(v) : c.type === 'percent' ? formatPercent(v) : String(v);
  return c.type === 'date' ? formatDate(v) : v;
}

export default function Reports() {
  const data = useFinanceData();
  const { preset, setPreset, custom, setCustom, period } = usePeriod('3m');
  const [selected, setSelected] = useState<ReportKind[]>(['expenses']);
  const [preview, setPreview] = useState<ReportKind>('expenses');
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const table = useMemo(() => buildReport(preview, data, period), [preview, data, period]);
  const toggle = (k: ReportKind) => {
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
    setPreview(k);
  };

  const { canUse } = usePlan();
  const run = async (f: ExportFormat) => {
    if (!selected.length) return toast.warning(t('Selecione ao menos um relatório'));
    if (f !== 'csv' && !canUse('export')) return;
    setBusy(f);
    try {
      const tables = selected.map((k) => buildReport(k, data, period));
      await exportTables(f, tables, selected.length > 1 ? t('Relatório financeiro') : tables[0].title);
      toast.success(t(selected.length > 1 ? 'Relatórios gerados em {formato}' : 'Relatório gerado em {formato}', { formato: f.toUpperCase() }), { description: f === 'csv' && selected.length > 1 ? t('Um arquivo CSV por relatório.') : undefined });
    } catch (e) {
      console.error(e);
      toast.error(t('Não foi possível gerar o arquivo'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title={t('Relatórios')} description={t('Relatórios profissionais prontos para exportar em PDF, Excel ou CSV.')} actions={<PeriodFilter preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom} />} />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader title={t('Escolha os relatórios')} description={t('{de} a {ate}', { de: formatDate(period.from), ate: formatDate(period.to) })} />
          <CardBody className="space-y-1 pt-3">
            {REPORTS.map((r) => {
              const on = selected.includes(r.kind);
              return (
                <button key={r.kind} onClick={() => toggle(r.kind)} aria-pressed={on} className={cn('flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-2', preview === r.kind && 'bg-surface-2')}>
                  {on ? <CheckSquare className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> : <Square className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />}
                  <span>
                    <span className="block text-sm font-medium">{t(r.title)}</span>
                    <span className="block text-xs text-fg-subtle">{t(r.description)}</span>
                  </span>
                </button>
              );
            })}
            <div className="grid grid-cols-3 gap-2 pt-4">
              <Button variant="secondary" size="sm" loading={busy === 'pdf'} leftIcon={<FileText className="size-3.5" />} onClick={() => run('pdf')}>PDF</Button>
              <Button variant="secondary" size="sm" loading={busy === 'xlsx'} leftIcon={<FileSpreadsheet className="size-3.5" />} onClick={() => run('xlsx')}>Excel</Button>
              <Button variant="secondary" size="sm" loading={busy === 'csv'} leftIcon={<Sheet className="size-3.5" />} onClick={() => run('csv')}>CSV</Button>
            </div>
            <p className="pt-1 text-center text-xs text-fg-subtle">{t(selected.length === 1 ? '{n} selecionado' : '{n} selecionados', { n: selected.length })} · {t('Excel gera uma aba por relatório')}</p>
          </CardBody>
        </Card>
        <Card className="min-w-0">
          <CardHeader title={`${t('Pré-visualização')} · ${table.title}`} description={table.subtitle} action={<Badge>{t(table.rows.length === 1 ? '{n} linha' : '{n} linhas', { n: table.rows.length })}</Badge>} />
          <CardBody>
            {table.summary && (
              <dl className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {table.summary.map((s) => (
                  <div key={s.label} className="rounded-xl bg-surface-2/70 p-3">
                    <dt className="text-xs text-fg-subtle">{s.label}</dt>
                    <dd className="tabular mt-0.5 text-sm font-semibold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="scrollbar-thin max-h-[560px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    {table.columns.map((c) => (
                      <th key={c.key} className={cn('px-3 py-2.5 text-left text-xs font-medium text-fg-subtle', c.type && c.type !== 'text' && c.type !== 'date' && 'text-right')}>{c.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {table.rows.slice(0, 300).map((r, i) => (
                    <tr key={i} className="hover:bg-surface-2/50">
                      {table.columns.map((c) => (
                        <td key={c.key} className={cn('px-3 py-2', c.type && c.type !== 'text' && c.type !== 'date' && 'tabular text-right', typeof r[c.key] === 'number' && (r[c.key] as number) < 0 && 'text-danger')}>{cell(r[c.key], c)}</td>
                      ))}
                    </tr>
                  ))}
                  {table.rows.length === 0 && (
                    <tr><td colSpan={table.columns.length} className="px-3 py-10 text-center text-fg-subtle">{t('Sem dados para este relatório no período.')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {table.rows.length > 300 && <p className="mt-2 text-xs text-fg-subtle">{t('Mostrando 300 de {n} linhas. A exportação inclui todas.', { n: table.rows.length })}</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
