import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '@/hooks/useDashboardData';

const COLORS = ['hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--secondary))', '#6366f1'];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function DespesasPorTipoWidget() {
  const { despesasPorTipo, loading } = useDashboardData();
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2"><CardTitle className="font-display text-base">Despesas por Tipo</CardTitle></CardHeader>
      <CardContent className="flex-1 min-h-0">
        {loading ? <Skeleton className="h-full w-full" /> : despesasPorTipo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem despesas registradas.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <PieChart>
              <Pie data={despesasPorTipo} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {despesasPorTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function EvolucaoMensalWidget() {
  const { evolucaoMensal, loading } = useDashboardData();
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2"><CardTitle className="font-display text-base">Evolução Mensal</CardTitle></CardHeader>
      <CardContent className="flex-1 min-h-0">
        {loading ? <Skeleton className="h-full w-full" /> : evolucaoMensal.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem movimentação mensal.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <BarChart data={evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
