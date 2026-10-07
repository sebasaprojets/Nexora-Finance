import { formatDate, today } from './dates';
import { formatMoney, formatPercent } from './format';

/**
 * Exportação de tabelas em CSV, Excel (.xlsx) e PDF.
 * Bibliotecas pesadas (jsPDF, write-excel-file) são carregadas sob demanda.
 */

export type ColumnType = 'text' | 'money' | 'date' | 'number' | 'percent';

export interface ExportColumn {
  header: string;
  key: string;
  type?: ColumnType;
  width?: number;
}

export type ExportRow = Record<string, string | number | null | undefined>;

export interface ExportTable {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  /** Linhas de resumo exibidas abaixo da tabela (PDF) / ao final (CSV/Excel). */
  summary?: { label: string; value: string }[];
}

function display(v: ExportRow[string], type: ColumnType = 'text'): string {
  if (v === null || v === undefined || v === '') return '';
  if (type === 'money' && typeof v === 'number') return formatMoney(v);
  if (type === 'percent' && typeof v === 'number') return formatPercent(v);
  if (type === 'date' && typeof v === 'string') return formatDate(v);
  if (type === 'number' && typeof v === 'number') return String(v).replace('.', ',');
  return String(v);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const fileName = (title: string, ext: string) => `nexora-${slug(title)}-${today()}.${ext}`;

/** Protege contra "CSV injection" em planilhas (células iniciando com = + - @). */
function csvSafe(s: string) {
  const v = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV com `;` e BOM — abre corretamente no Excel em pt-BR. Números em formato brasileiro. */
export function exportCSV(t: ExportTable) {
  const lines = [t.columns.map((c) => csvSafe(c.header)).join(';')];
  for (const r of t.rows) {
    lines.push(
      t.columns
        .map((c) => {
          const v = r[c.key];
          if (typeof v === 'number' && (c.type === 'money' || c.type === 'number' || c.type === 'percent')) return v.toFixed(2).replace('.', ',');
          return csvSafe(display(v, c.type));
        })
        .join(';'),
    );
  }
  if (t.summary?.length) {
    lines.push('');
    for (const s of t.summary) lines.push(`${csvSafe(s.label)};${csvSafe(s.value)}`);
  }
  download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), fileName(t.title, 'csv'));
}

export async function exportExcel(tables: ExportTable | ExportTable[]) {
  const list = Array.isArray(tables) ? tables : [tables];
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const sheets = list.map((t) => {
    const header = t.columns.map((c) => ({ value: c.header, fontWeight: 'bold' as const, backgroundColor: '#EEF0F7' }));
    const body = t.rows.map((r) =>
      t.columns.map((c) => {
        const v = r[c.key];
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') {
          if (c.type === 'money') return { value: v, type: Number, format: '"R$" #,##0.00;-"R$" #,##0.00' };
          if (c.type === 'percent') return { value: v / 100, type: Number, format: '0.0%' };
          return { value: v, type: Number };
        }
        if (c.type === 'date' && typeof v === 'string') {
          const [y, m, d] = v.split('-').map(Number);
          return { value: new Date(Date.UTC(y, m - 1, d)), type: Date, format: 'dd/mm/yyyy' };
        }
        return { value: String(v), type: String };
      }),
    );
    const summary = t.summary?.length ? [[], ...t.summary.map((s) => [{ value: s.label, fontWeight: 'bold' as const }, { value: s.value }])] : [];
    return {
      data: [header, ...body, ...summary],
      sheet: t.title.slice(0, 31).replace(/[\\/?*[\]:]/g, '-'),
      columns: t.columns.map((c) => ({ width: c.width ?? (c.type === 'text' ? 28 : 16) })),
    };
  });
  // A tipagem da lib é bem estrita para objetos de célula; os dados acima seguem o formato documentado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await (writeXlsxFile as any)(sheets).toBlob();
  download(blob, fileName(list[0].title, 'xlsx'));
}

export async function exportPDF(tables: ExportTable | ExportTable[], docTitle?: string) {
  const list = Array.isArray(tables) ? tables : [tables];
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const title = docTitle ?? list[0].title;

  const header = () => {
    doc.setFillColor(13, 15, 22);
    doc.rect(0, 0, W, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Nexora Finance', 40, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(170, 176, 196);
    doc.text(`${title} · gerado em ${formatDate(today())}`, 40, 46);
  };

  header();
  let y = 92;
  for (const t of list) {
    if (y > 700) {
      doc.addPage();
      header();
      y = 92;
    }
    doc.setTextColor(12, 15, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(t.title, 40, y);
    if (t.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(115, 122, 146);
      doc.text(t.subtitle, 40, y + 14);
    }
    autoTable(doc, {
      startY: y + (t.subtitle ? 24 : 12),
      head: [t.columns.map((c) => c.header)],
      body: t.rows.map((r) => t.columns.map((c) => display(r[c.key], c.type))),
      margin: { left: 40, right: 40, top: 80 },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: [30, 34, 48], lineColor: [230, 233, 241], lineWidth: 0.5 },
      headStyles: { fillColor: [91, 76, 240], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      columnStyles: Object.fromEntries(t.columns.map((c, i) => [i, { halign: c.type && c.type !== 'text' && c.type !== 'date' ? 'right' : 'left' }])),
      didDrawPage: (d) => {
        if (d.pageNumber > 1) header();
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 18;
    if (t.summary?.length) {
      doc.setFontSize(9);
      for (const s of t.summary) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(12, 15, 26);
        doc.text(s.label, 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(s.value, W - 40, y, { align: 'right' });
        y += 14;
      }
    }
    y += 24;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text(`Página ${i} de ${pages}`, W - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    doc.text('Relatório informativo. Não constitui recomendação financeira.', 40, doc.internal.pageSize.getHeight() - 20);
  }
  doc.save(fileName(title, 'pdf'));
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export async function exportTables(format: ExportFormat, tables: ExportTable[], title?: string) {
  if (format === 'csv') {
    // CSV não suporta múltiplas abas: concatena em um arquivo por tabela.
    for (const t of tables) exportCSV(t);
  } else if (format === 'xlsx') await exportExcel(tables);
  else await exportPDF(tables, title);
}
