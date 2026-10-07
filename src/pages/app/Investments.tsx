import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Info, MoreHorizontal, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/EmptyState';
import { Donut } from '@/components/charts/Donut';
import { axisProps, ChartTooltipBox } from '@/components/charts/ChartTooltip';
import { ExportMenu } from '@/components/common/ExportMenu';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { INVESTMENT_LABELS, portfolioSummary } from '@/lib/finance';
import { formatMonthLong, formatMonthShort, monthKey, today } from '@/lib/dates';
import { formatMoney, formatPercent, parseMoneyInput, round2 } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { cn } from '@/lib/cn';
import type { Investment, InvestmentType } from '@/types';
import { currentLang, t } from '@/i18n';

// Ordem fixa de cores por tipo (a cor segue a entidade, nunca a posição no ranking).
export const TYPE_COLORS: Record<InvestmentType, string> = {
  fixed_income: 'var(--series-1)',
  stocks: 'var(--series-2)',
  reits: 'var(--series-3)',
  etfs: 'var(--series-4)',
  crypto: 'var(--series-5)',
  funds: 'var(--series-7)',
  pension: 'var(--series-6)',
};

/** Nome da classe no idioma atual ("Ações" sozinho colide com o rótulo genérico "Ações" = menu de ações). */
const typeLabel = (ty: InvestmentType) => (ty === 'stocks' && currentLang() !== 'pt' ? t('Ações (classe de ativo)') : t(INVESTMENT_LABELS[ty]));

function InvestmentModal({ open, onClose, inv }: { open: boolean; onClose: () => void; inv?: Investment }) {
  const upsert = useFinance((s) => s.upsert);
  const blank = { name: '', ticker: '', type: 'fixed_income' as InvestmentType, institution: '', invested: '', current: '', dividends: '' };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<Record<string, string>>({});
  const [key, setKey] = useState('');
  const k = `${open}-${inv?.id}`;
  if (open && key !== k) {
    setKey(k);
    setErr({});
    const m = (v: number) => formatMoney(v).replace(/[^\d,.]/g, '');
    setF(inv ? { name: inv.name, ticker: inv.ticker ?? '', type: inv.type, institution: inv.institution, invested: m(inv.invested), current: m(inv.currentValue), dividends: m(inv.dividends) } : blank);
  }
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = () => {
    const e: Record<string, string> = {};
    const invested = parseMoneyInput(f.invested);
    const current = f.current ? parseMoneyInput(f.current) : invested;
    if (!f.name.trim()) e.name = 'Informe um nome';
    if (!(invested > 0)) e.invested = 'Informe o valor aplicado';
    if (!(current >= 0)) e.current = 'Valor inválido';
    setErr(e);
    if (Object.keys(e).length) return;
    const month = monthKey(today());
    const history = (inv?.history ?? []).filter((h) => h.month !== month);
    upsert('investments', {
      id: inv?.id ?? uid('inv'),
      name: sanitizeText(f.name, 50),
      ticker: sanitizeText(f.ticker, 12).toUpperCase() || undefined,
      type: f.type,
      institution: sanitizeText(f.institution, 40) || '—',
      invested,
      currentValue: current,
      dividends: parseMoneyInput(f.dividends) || 0,
      history: [...history, { month, value: current }].sort((a, b) => a.month.localeCompare(b.month)),
      createdAt: inv?.createdAt ?? new Date().toISOString(),
    });
    toast.success(inv ? t('Investimento atualizado') : t('Investimento adicionado'));
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={inv ? t('Atualizar investimento') : t('Novo investimento')} size="lg" footer={<><Button variant="ghost" onClick={onClose}>{t('Cancelar')}</Button><Button onClick={save}>{t('Salvar')}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Nome do ativo')} error={err.name}>{(p) => <Input {...p} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('Ex.: Tesouro Selic 2029')} data-autofocus />}</Field>
        <Field label={t('Ticker (opcional)')}>{(p) => <Input {...p} value={f.ticker} onChange={(e) => set({ ticker: e.target.value })} placeholder={t('Ex.: ITSA4')} />}</Field>
        <Field label={t('Classe')}>
          {(p) => (
            <Select {...p} value={f.type} onChange={(e) => set({ type: e.target.value as InvestmentType })}>
              {(Object.keys(INVESTMENT_LABELS) as InvestmentType[]).map((k2) => <option key={k2} value={k2}>{typeLabel(k2)}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('Instituição')}>{(p) => <Input {...p} value={f.institution} onChange={(e) => set({ institution: e.target.value })} placeholder={t('Corretora ou banco')} />}</Field>
        <Field label={t('Valor aplicado')} error={err.invested}>{(p) => <Input {...p} value={f.invested} onChange={(e) => set({ invested: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
        <Field label={t('Valor atual de mercado')} error={err.current} hint={t('Atualize periodicamente')}>{(p) => <Input {...p} value={f.current} onChange={(e) => set({ current: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
        <Field label={t('Dividendos/proventos recebidos')}>{(p) => <Input {...p} value={f.dividends} onChange={(e) => set({ dividends: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
      </div>
    </Modal>
  );
}

export default function Investments() {
  const investments = useFinance((s) => s.investments);
  const remove = useFinance((s) => s.remove);
  const money = useMoney();
  const [modal, setModal] = useState<{ open: boolean; inv?: Investment }>({ open: false });
  const [confirm, setConfirm] = useState<Investment | null>(null);
  const [filter, setFilter] = useState<'all' | InvestmentType>('all');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const p = useMemo(() => portfolioSummary(investments), [investments]);
  const list = investments.filter((i) => filter === 'all' || i.type === filter).sort((a, b) => b.currentValue - a.currentValue);
  const firstHist = p.history[0]?.value ?? 0;
  const types = [...new Set(investments.map((i) => i.type))];

  return (
    <div>
      <PageHeader
        title={t('Investimentos')}
        description={t('Patrimônio, rentabilidade, proventos e distribuição da carteira.')}
        actions={
          <>
            <ExportMenu
              title={t('Carteira de investimentos')}
              getTables={() => [
                {
                  title: t('Carteira de investimentos'),
                  columns: [
                    { header: t('Ativo'), key: 'name', width: 28 },
                    { header: t('Classe'), key: 'type' },
                    { header: t('Instituição'), key: 'inst' },
                    { header: t('Aplicado'), key: 'invested', type: 'money' },
                    { header: t('Atual'), key: 'current', type: 'money' },
                    { header: t('Rentab.'), key: 'ret', type: 'percent' },
                    { header: t('Proventos'), key: 'div', type: 'money' },
                  ],
                  rows: investments.map((i) => ({ name: i.ticker ? `${i.name} (${i.ticker})` : i.name, type: typeLabel(i.type), inst: i.institution, invested: i.invested, current: i.currentValue, ret: i.invested ? ((i.currentValue - i.invested) / i.invested) * 100 : 0, div: i.dividends })),
                  summary: [
                    { label: t('Patrimônio'), value: formatMoney(p.current) },
                    { label: t('Rentabilidade'), value: `${formatMoney(p.profit)} (${formatPercent(p.returnPct)})` },
                  ],
                },
              ]}
            />
            <Button leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true })}>{t('Novo ativo')}</Button>
          </>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-xs text-fg-muted" role="note">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>{t('Conteúdo informativo e educacional. Rentabilidade passada não garante resultados futuros. A Nexora não oferece recomendação de investimento nem garantia de retorno. Valores de mercado são informados por você.')}</p>
      </div>

      {investments.length === 0 ? (
        <Card><EmptyState icon={<TrendingUp />} title={t('Nenhum investimento registrado')} description={t('Cadastre seus ativos de renda fixa, ações, FIIs, ETFs, cripto, fundos e previdência.')} action={<Button onClick={() => setModal({ open: true })}>{t('+ Adicionar investimento')}</Button>} /></Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard emphasis className="col-span-2 lg:col-span-1" label={t('Patrimônio investido')} value={p.current} format={(v) => money(v)} delta={firstHist ? ((p.current - firstHist) / firstHist) * 100 : null} comparison={t('em 12 meses')} spark={p.history.map((h) => h.value)} sparkColor="var(--series-7)" info={t('Soma do valor de mercado atual de todos os ativos. A variação inclui novos aportes.')} />
            <StatCard label={t('Total aplicado')} value={p.invested} format={(v) => money(v)} info={t('Soma dos valores efetivamente aportados.')} />
            <StatCard label={t('Rentabilidade')} value={p.profit} format={(v) => money(v, { signed: true })} delta={p.returnPct} comparison={t('sobre o aplicado')} info={t('Valor atual − valor aplicado (não considera proventos).')} />
            <StatCard label={t('Proventos')} value={p.dividends} format={(v) => money(v)} comparison={p.current ? t('yield acumulado {pct}', { pct: formatPercent((p.dividends / p.invested) * 100) }) : undefined} info={t('Dividendos, JCP e rendimentos recebidos.')} />
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title={t('Evolução do patrimônio')} description={t('Valor de mercado consolidado por mês')} />
              <CardBody>
                <div className="h-72" role="img" aria-label={t('Evolução mensal do patrimônio investido')}>
                  <ResponsiveContainer>
                    <AreaChart data={p.history.map((h) => ({ ...h, label: formatMonthShort(h.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="inv-g" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--series-7)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--series-7)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                      <Tooltip content={({ active, payload }) => (active && payload?.length ? <ChartTooltipBox title={formatMonthLong((payload[0].payload as { month: string }).month)} rows={[{ label: t('Patrimônio'), value: money(Number(payload[0].value)), color: 'var(--series-7)' }]} /> : null)} />
                      <Area type="monotone" dataKey="value" stroke="var(--series-7)" strokeWidth={2} fill="url(#inv-g)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('Distribuição')} description={t('Por classe de ativo')} />
              <CardBody>
                <Donut size={180} total={p.current} centerLabel={t('Portfólio')} selected={selectedType} onSelect={(id) => { setSelectedType(id); setFilter((id as InvestmentType) ?? 'all'); }} data={p.allocation.map((a) => ({ id: a.type, label: typeLabel(a.type), value: a.value, pct: a.pct, color: TYPE_COLORS[a.type] }))} />
                <ul className="mt-4 space-y-2">
                  {p.allocation.map((a) => (
                    <li key={a.type} className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-full" style={{ background: TYPE_COLORS[a.type] }} aria-hidden />
                      <span className="flex-1 text-fg-muted">{typeLabel(a.type)}</span>
                      <span className="tabular text-xs text-fg-subtle">{formatPercent(a.pct)}</span>
                      <span className="tabular w-24 text-right font-medium">{money(a.value)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader
              title={t('Ativos')}
              action={
                <Segmented
                  size="sm"
                  label={t('Filtrar por classe')}
                  value={filter}
                  onChange={(v) => { setFilter(v); setSelectedType(v === 'all' ? null : v); }}
                  options={[{ value: 'all' as const, label: t('Todos') }, ...types.map((ty) => ({ value: ty, label: typeLabel(ty) }))]}
                  className="max-w-[60vw]"
                />
              }
            />
            <CardBody className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-fg-subtle">
                    <th className="pb-2 font-medium">{t('Ativo')}</th>
                    <th className="pb-2 font-medium">{t('Classe')}</th>
                    <th className="pb-2 text-right font-medium">{t('Aplicado')}</th>
                    <th className="pb-2 text-right font-medium">{t('Atual')}</th>
                    <th className="pb-2 text-right font-medium">{t('Rentabilidade')}</th>
                    <th className="pb-2 text-right font-medium">{t('Proventos')}</th>
                    <th className="pb-2 text-right font-medium">{t('% carteira')}</th>
                    <th className="pb-2"><span className="sr-only">{t('Ações')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((i) => {
                    const ret = i.invested ? ((i.currentValue - i.invested) / i.invested) * 100 : 0;
                    return (
                      <tr key={i.id}>
                        <td className="py-3">
                          <p className="font-medium">{i.name}</p>
                          <p className="text-xs text-fg-subtle">{i.ticker ? `${i.ticker} · ` : ''}{i.institution}</p>
                        </td>
                        <td className="py-3"><span className="inline-flex items-center gap-1.5 text-fg-muted"><span className="size-2 rounded-full" style={{ background: TYPE_COLORS[i.type] }} aria-hidden />{typeLabel(i.type)}</span></td>
                        <td className="tabular py-3 text-right text-fg-muted">{money(i.invested)}</td>
                        <td className="tabular py-3 text-right font-semibold">{money(i.currentValue)}</td>
                        <td className={cn('tabular py-3 text-right font-medium', ret >= 0 ? 'text-success' : 'text-danger')}>
                          {ret >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(ret))}
                          <span className="block text-xs font-normal text-fg-subtle">{money(round2(i.currentValue - i.invested), { signed: true })}</span>
                        </td>
                        <td className="tabular py-3 text-right text-fg-muted">{money(i.dividends)}</td>
                        <td className="tabular py-3 text-right text-fg-muted">{formatPercent(p.current ? (i.currentValue / p.current) * 100 : 0)}</td>
                        <td className="py-3 text-right">
                          <Dropdown
                            label={t('Ações')}
                            trigger={(pp) => <Button variant="ghost" size="icon-sm" aria-label={t('Ações para {name}', { name: i.name })} {...pp}><MoreHorizontal className="size-4" /></Button>}
                            items={[
                              { label: t('Atualizar valores'), icon: <Pencil />, onSelect: () => setModal({ open: true, inv: i }) },
                              { label: t('Excluir'), icon: <Trash2 />, danger: true, onSelect: () => setConfirm(i) },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}

      <InvestmentModal open={modal.open} inv={modal.inv} onClose={() => setModal({ open: false })} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title={t('Excluir ativo?')} description={t('O histórico deste ativo será removido.')} confirmLabel={t('Excluir')} onConfirm={() => { if (confirm) remove('investments', confirm.id); toast.success(t('Ativo removido')); }} />
    </div>
  );
}
