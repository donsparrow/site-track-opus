import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '@/hooks/useDashboardData';
import SensitiveValue from '@/components/dashboard/SensitiveValue';

const COLORS = ['hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--secondary))', '#6366f1'];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function LegendItem({ color, name, value, extra }: { color: string; name: string; value: number; extra?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs min-w-0">
      <span className="h-2.5 w-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate text-muted-foreground">{name}</span>
      <span className="ml-auto text-right font-medium tabular-nums whitespace-nowrap">
        <SensitiveValue>{fmt(value)}</SensitiveValue>
        {extra && <span className="text-muted-foreground ml-1">{extra}</span>}
      </span>
    </div>
  );
}

export function DespesasPorTipoWidget() {
  const { despesasPorTipo, loading } = useDashboardData();
  const total = despesasPorTipo.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-display font-semibold">Despesas por Tipo</CardTitle></CardHeader>
      <CardContent className="flex-1 min-h-0">
        {loading ? <Skeleton className="h-full w-full" /> : despesasPorTipo.length === 0 ? (
          <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">Sem despesas registradas.</p>
        ) : (
          <div className="h-full flex flex-col sm:flex-row items-center gap-4 min-h-0">
            <div className="relative shrink-0 w-[160px] h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={despesasPorTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                    {despesasPorTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-display font-bold leading-none">
                  <SensitiveValue>{fmt(total)}</SensitiveValue>
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">total</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-1.5 overflow-auto">
              {despesasPorTipo.map((d, i) => (
                <LegendItem
                  key={d.name}
                  color={COLORS[i % COLORS.length]}
                  name={d.name}
                  value={d.value}
                  extra={total > 0 ? `(${Math.round((d.value / total) * 100)}%)` : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EvolucaoMensalWidget() {
  const { evolucaoMensal, loading } = useDashboardData();
  const totalRec = evolucaoMensal.reduce((s, m) => s + m.Receitas, 0);
  const totalDesp = evolucaoMensal.reduce((s, m) => s + m.Despesas, 0);

  return (
    <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-display font-semibold">Evolução Mensal</CardTitle></CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {loading ? <Skeleton className="h-full w-full" /> : evolucaoMensal.length === 0 ? (
          <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">Sem movimentação mensal.</p>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                <BarChart data={evolucaoMensal} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="Receitas" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <LegendItem color="hsl(var(--success))" name="Receitas" value={totalRec} />
              <LegendItem color="hsl(var(--destructive))" name="Despesas" value={totalDesp} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
