import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { PageHeader } from '@/components/common/PageHeader';
import { PeriodFilter } from '@/components/common/PeriodFilter';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Overview } from '@/components/analytics/Overview';
import { Spending } from '@/components/analytics/Spending';
import { Income } from '@/components/analytics/Income';
import { CashFlow } from '@/components/analytics/CashFlow';
import { Compare } from '@/components/analytics/Compare';
import { useFinanceData } from '@/hooks/useFinanceData';
import { usePeriod } from '@/hooks/usePeriod';
import { formatDate } from '@/lib/dates';
import { t } from '@/i18n';

type Tab = 'visao' | 'gastos' | 'receitas' | 'fluxo' | 'comparar';

export default function Analytics() {
  const data = useFinanceData();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('aba') as Tab) || 'visao';
  const setTab = (next: Tab) => setParams({ aba: next }, { replace: true });
  const { preset, setPreset, custom, setCustom, period, previous } = usePeriod('6m');
  usePageTour('analytics', data.transactions.length > 0);
  const showPeriod = tab === 'visao' || tab === 'gastos' || tab === 'receitas';

  return (
    <div>
      <PageHeader
        title={t('Análises Financeiras')}
        description={showPeriod ? t('{de} a {ate} · comparado com {antDe} a {antAte}', { de: formatDate(period.from), ate: formatDate(period.to), antDe: formatDate(previous.from), antAte: formatDate(previous.to) }) : t('Gráficos, tabelas e indicadores calculados com seus dados reais.')}
        actions={
          <>
            <TourButton id="analytics" />
            {showPeriod && <PeriodFilter preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom} />}
          </>
        }
      />
      <div data-tour="analytics-tabs">
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6"
        tabs={[
          { value: 'visao', label: t('Visão geral') },
          { value: 'gastos', label: t('Gastos') },
          { value: 'receitas', label: t('Receitas') },
          { value: 'fluxo', label: t('Fluxo de caixa') },
          { value: 'comparar', label: t('Comparar períodos') },
        ]}
      />
      </div>
      {data.transactions.length === 0 ? (
        <Card>
          <EmptyState icon={<BarChart3 />} title={t('Sem dados para analisar')} description={t('Registre receitas e despesas para ver gráficos, DRE, fluxo de caixa e insights.')} />
        </Card>
      ) : (
        <div role="tabpanel">
          {tab === 'visao' && <Overview data={data} period={period} previous={previous} />}
          {tab === 'gastos' && <Spending data={data} period={period} />}
          {tab === 'receitas' && <Income data={data} period={period} previous={previous} />}
          {tab === 'fluxo' && <CashFlow data={data} />}
          {tab === 'comparar' && <Compare data={data} />}
        </div>
      )}
    </div>
  );
}
