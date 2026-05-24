import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Building2, CheckCircle2, Clock, Activity } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function KpiCard({ label, value, Icon, color, loading }: { label: string; value: string | number; Icon: LucideIcon; color?: string; loading?: boolean }) {
  return (
    <Card className="h-full">
      <CardContent className="pt-6 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <p className={`text-2xl font-display font-bold ${color || ''} truncate`}>{value}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 shrink-0 ml-2 ${color || 'text-accent'}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiContratosWidget() {
  const { totals, loading } = useDashboardData();
  return <KpiCard label="Total Contratos" value={fmt(totals.totalContratos)} Icon={DollarSign} color="text-accent" loading={loading} />;
}
export function KpiRecebidoWidget() {
  const { totals, loading } = useDashboardData();
  return <KpiCard label="Total Recebido" value={fmt(totals.totalRecebido)} Icon={TrendingUp} color="text-success" loading={loading} />;
}
export function KpiGastosWidget() {
  const { totals, loading } = useDashboardData();
  return <KpiCard label="Total Gastos" value={fmt(totals.totalGastos)} Icon={TrendingDown} color="text-destructive" loading={loading} />;
}
export function KpiParcelasAtrasadasWidget() {
  const { totals, loading } = useDashboardData();
  const v = totals.parcelasAtrasadas;
  return <KpiCard label="Parcelas Atrasadas" value={v} Icon={AlertTriangle} color={v > 0 ? 'text-destructive' : 'text-foreground'} loading={loading} />;
}

// OBRAS
export function ObrasAndamentoWidget() {
  const { obras, loading } = useDashboardData();
  const count = obras.filter(o => o.status === 'andamento' || o.status === 'planejamento').length;
  return <KpiCard label="Obras em Andamento" value={count} Icon={Building2} color="text-primary" loading={loading} />;
}
export function ObrasConcluidasWidget() {
  const { obras, loading } = useDashboardData();
  const count = obras.filter(o => o.status === 'concluida').length;
  return <KpiCard label="Obras Concluídas" value={count} Icon={CheckCircle2} color="text-success" loading={loading} />;
}
export function ObrasAtrasadasWidget() {
  const { obras, loading } = useDashboardData();
  const today = new Date().toISOString().split('T')[0];
  const count = obras.filter(o => o.data_fim_prevista && o.data_fim_prevista < today && o.status !== 'concluida').length;
  return <KpiCard label="Obras Atrasadas" value={count} Icon={AlertTriangle} color={count > 0 ? 'text-destructive' : 'text-foreground'} loading={loading} />;
}
export function EvolucaoFisicaWidget() {
  const { atividades, loading } = useDashboardData();
  const avg = atividades.length > 0 ? Math.round(atividades.reduce((s, a) => s + (a.percentual || 0), 0) / atividades.length) : 0;
  return <KpiCard label="Evolução Física Média" value={`${avg}%`} Icon={Activity} color="text-accent" loading={loading} />;
}

// FINANCEIRO extras
export function ContasReceberWidget() {
  const { parcelas, loading } = useDashboardData();
  const total = parcelas.filter(p => !p.data_recebimento).reduce((s, p) => s + p.valor, 0);
  return <KpiCard label="Contas a Receber" value={fmt(total)} Icon={Clock} color="text-warning" loading={loading} />;
}
export function ContasPagarWidget() {
  const { despesas, loading } = useDashboardData();
  const today = new Date().toISOString().split('T')[0];
  const total = despesas.filter(d => d.data_vencimento && d.data_vencimento >= today).reduce((s, d) => s + d.valor, 0);
  return <KpiCard label="Contas a Pagar" value={fmt(total)} Icon={Clock} color="text-destructive" loading={loading} />;
}
