import { useMemo } from 'react';
import { Info, Lightbulb } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ScoreGauge } from '@/components/common/ScoreGauge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Sparkline } from '@/components/ui/Sparkline';
import { useFinanceData } from '@/hooks/useFinanceData';
import { financialScore } from '@/lib/score';
import { addMonths, endOfMonth, formatMonthShort, monthKey, today } from '@/lib/dates';
import { cn } from '@/lib/cn';

export default function Health() {
  const data = useFinanceData();
  const s = useMemo(() => financialScore(data), [data]);
  const history = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const ref = i === 5 ? today() : endOfMonth(addMonths(today(), i - 5));
        return { month: monthKey(ref), score: financialScore(data, ref).score };
      }),
    [data],
  );
  const sorted = [...s.factors].sort((a, b) => a.value - b.value);

  return (
    <div>
      <PageHeader title="Minha Saúde Financeira" description="Um retrato da sua vida financeira, recalculado a cada lançamento." />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="holo flex flex-col items-center p-6 text-center">
          <p className="text-sm font-medium text-fg-muted">Score Financeiro Nexora</p>
          <div className="mt-4"><ScoreGauge score={s.score} label={s.band.label} /></div>
          <p className="mt-4 text-xs text-fg-subtle">Escala de 0 a 1000 · Excelente ≥ 800 · Boa ≥ 650 · Regular ≥ 450</p>
          <div className="mt-6 w-full">
            <p className="mb-1 text-left text-xs text-fg-subtle">Evolução (6 meses)</p>
            <Sparkline data={history.map((h) => h.score)} height={48} color="var(--primary)" label="Evolução do score nos últimos 6 meses" />
            <div className="mt-1 flex justify-between text-[10px] text-fg-subtle">
              {history.map((h) => <span key={h.month}>{formatMonthShort(h.month)}</span>)}
            </div>
          </div>
          <div role="note" className="mt-6 flex gap-2 rounded-xl bg-surface-2/70 p-3 text-left text-xs text-fg-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Indicador educativo calculado apenas com os dados que você registrou na Nexora. <strong>Não é um score de crédito</strong> e não tem relação com birôs como Serasa, SPC ou Boa Vista.
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Como seu score é calculado" description="Seis fatores com pesos fixos. Cada um vale de 0 a 100." />
            <CardBody className="space-y-4">
              {s.factors.map((f) => (
                <div key={f.key}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{f.label} <span className="text-xs font-normal text-fg-subtle">· peso {Math.round(f.weight * 100)}%</span></span>
                    <span className="tabular text-xs text-fg-subtle">{Math.round(f.value)}/100 · +{Math.round(f.value * f.weight * 10)} pts</span>
                  </div>
                  <Progress value={f.value} className="mt-1.5" color={f.value >= 70 ? 'var(--success)' : f.value >= 40 ? 'var(--warning)' : 'var(--danger)'} label={f.label} />
                  <p className="mt-1 text-xs text-fg-subtle">{f.detail}</p>
                </div>
              ))}
              <p className="rounded-lg bg-surface-2/70 px-3 py-2 text-xs text-fg-muted">
                Score = Σ (fator × peso) × 10. Controle de gastos usa a taxa de economia dos últimos 3 meses (meta 30%); reserva = meses de despesas cobertos por poupança e renda fixa (meta 6); dívidas = parcelas ÷ renda (0% = 100 pts, 40%+ = 0); orçamento = % de limites respeitados; consistência = meses no azul nos últimos 6; investimentos = patrimônio investido vs. 12 meses de gastos.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Como melhorar" icon={<Lightbulb />} description="Comece pelos fatores com menor pontuação" />
            <CardBody className="grid gap-3 sm:grid-cols-3">
              {sorted.slice(0, 3).map((f, i) => (
                <div key={f.key} className={cn('rounded-xl border p-4', i === 0 ? 'border-primary/40 bg-primary-soft' : 'border-border')}>
                  <p className="text-xs font-medium text-fg-subtle">Prioridade {i + 1}</p>
                  <p className="mt-1 text-sm font-semibold">{f.label}</p>
                  <p className="mt-1 text-xs text-fg-muted">{f.tip}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
