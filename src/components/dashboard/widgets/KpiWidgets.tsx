import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Building2, CheckCircle2, Clock, Activity } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import SensitiveValue from '@/components/dashboard/SensitiveValue';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/10 text-warning',
};

function KpiCard({
  label,
  value,
  Icon,
  loading,
  valueClass,
  badge,
  badgeTone = 'neutral',
  footer,
}: {
  label: string;
  value: ReactNode;
  Icon: LucideIcon;
  loading?: boolean;
  valueClass?: string;
  badge?: ReactNode;
  badgeTone?: BadgeTone;
  footer?: ReactNode;
}) {
  return (
    <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 h-full flex flex-col justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={`text-2xl font-display font-bold truncate ${valueClass || 'text-foreground'}`}>{value}</p>
        )}
        {!loading && (footer || badge) && (
          <div className="space-y-1.5">
            {footer}
            {badge && (
              <span className={`inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 ${TONE_CLASS[badgeTone]}`}>
                {badge}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiContratosWidget() {
  const { totals, obras, loading } = useDashboardData();
  const ativas = obras.filter(o => o.status !== 'concluida').length;
  return (
    <KpiCard
      label="Total Contratos"
      value={<SensitiveValue>{fmt(totals.totalContratos)}</SensitiveValue>}
      Icon={DollarSign}
      loading={loading}
      badge={`${ativas} obra${ativas === 1 ? '' : 's'} ativa${ativas === 1 ? '' : 's'}`}
      badgeTone="neutral"
    />
  );
}

export function KpiRecebidoWidget() {
  const { totals, loading } = useDashboardData();
  const pct = totals.totalContratos > 0 ? Math.min(100, Math.round((totals.totalRecebido / totals.totalContratos) * 100)) : 0;
  return (
    <KpiCard
      label="Total Recebido"
      value={<SensitiveValue>{fmt(totals.totalRecebido)}</SensitiveValue>}
      Icon={TrendingUp}
      loading={loading}
      badge={`${pct}% do contratado`}
      badgeTone="success"
      footer={
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
        </div>
      }
    />
  );
}

export function KpiGastosWidget() {
  const { totals, despesas, loading } = useDashboardData();
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mesAnterior = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const somaMes = (m: string) => despesas.filter(d => d.data?.slice(0, 7) === m).reduce((s, d) => s + d.valor, 0);
  const atual = somaMes(mesAtual);
  const anterior = somaMes(mesAnterior);
  let badge = 'sem comparativo';
  let tone: BadgeTone = 'neutral';
  if (anterior > 0) {
    const varPct = Math.round(((atual - anterior) / anterior) * 100);
    badge = `${varPct > 0 ? '+' : ''}${varPct}% vs mês anterior`;
    tone = varPct > 0 ? 'danger' : varPct < 0 ? 'success' : 'neutral';
  }
  return (
    <KpiCard
      label="Total Gastos"
      value={<SensitiveValue>{fmt(totals.totalGastos)}</SensitiveValue>}
      Icon={TrendingDown}
      loading={loading}
      badge={badge}
      badgeTone={tone}
    />
  );
}

export function KpiParcelasAtrasadasWidget() {
  const { totals, loading } = useDashboardData();
  const v = totals.parcelasAtrasadas;
  return (
    <KpiCard
      label="Parcelas Atrasadas"
      value={v}
      Icon={AlertTriangle}
      loading={loading}
      valueClass={v > 0 ? 'text-destructive' : 'text-success'}
      badge={v > 0 ? 'requer ação' : 'nenhuma pendência'}
      badgeTone={v > 0 ? 'danger' : 'success'}
    />
  );
}

// OBRAS
export function ObrasAndamentoWidget() {
  const { obras, loading } = useDashboardData();
  const count = obras.filter(o => o.status === 'andamento' || o.status === 'planejamento').length;
  const total = obras.length;
  return (
    <KpiCard
      label="Obras em Andamento"
      value={count}
      Icon={Building2}
      loading={loading}
      badge={total > 0 ? `de ${total} obras` : undefined}
      badgeTone="neutral"
    />
  );
}

export function ObrasConcluidasWidget() {
  const { obras, loading } = useDashboardData();
  const count = obras.filter(o => o.status === 'concluida').length;
  const total = obras.length;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <KpiCard
      label="Obras Concluídas"
      value={count}
      Icon={CheckCircle2}
      loading={loading}
      badge={total > 0 ? `${pct}% do portfólio` : undefined}
      badgeTone="success"
    />
  );
}

export function ObrasAtrasadasWidget() {
  const { obras, loading } = useDashboardData();
  const today = new Date().toISOString().split('T')[0];
  const count = obras.filter(o => o.data_fim_prevista && o.data_fim_prevista < today && o.status !== 'concluida').length;
  return (
    <KpiCard
      label="Obras Atrasadas"
      value={count}
      Icon={AlertTriangle}
      loading={loading}
      valueClass={count > 0 ? 'text-destructive' : 'text-success'}
      badge={count > 0 ? 'requer ação' : 'prazos em dia'}
      badgeTone={count > 0 ? 'danger' : 'success'}
    />
  );
}

export function EvolucaoFisicaWidget() {
  const { atividades, loading } = useDashboardData();
  const avg = atividades.length > 0 ? Math.round(atividades.reduce((s, a) => s + (a.percentual || 0), 0) / atividades.length) : 0;
  return (
    <KpiCard
      label="Evolução Física Média"
      value={`${avg}%`}
      Icon={Activity}
      loading={loading}
      badge={atividades.length > 0 ? `${atividades.length} atividades` : undefined}
      badgeTone="neutral"
      footer={
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${avg}%` }} />
        </div>
      }
    />
  );
}

// FINANCEIRO extras
export function ContasReceberWidget() {
  const { parcelas, loading } = useDashboardData();
  const abertas = parcelas.filter(p => !p.data_recebimento);
  const total = abertas.reduce((s, p) => s + p.valor, 0);
  return (
    <KpiCard
      label="Contas a Receber"
      value={<SensitiveValue>{fmt(total)}</SensitiveValue>}
      Icon={Clock}
      loading={loading}
      badge={`${abertas.length} parcela${abertas.length === 1 ? '' : 's'} em aberto`}
      badgeTone="warning"
    />
  );
}

export function ContasPagarWidget() {
  const { despesas, loading } = useDashboardData();
  const today = new Date().toISOString().split('T')[0];
  const aVencer = despesas.filter(d => d.data_vencimento && d.data_vencimento >= today);
  const total = aVencer.reduce((s, d) => s + d.valor, 0);
  return (
    <KpiCard
      label="Contas a Pagar"
      value={<SensitiveValue>{fmt(total)}</SensitiveValue>}
      Icon={Clock}
      loading={loading}
      badge={`${aVencer.length} despesa${aVencer.length === 1 ? '' : 's'} a vencer`}
      badgeTone="neutral"
    />
  );
}
