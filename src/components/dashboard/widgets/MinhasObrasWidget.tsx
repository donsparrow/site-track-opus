import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import SensitiveValue from '@/components/dashboard/SensitiveValue';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export default function MinhasObrasWidget() {
  const { obras, atividades, diarios, loading } = useDashboardData();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="h-full shadow-sm">
        <CardContent className="p-4 grid gap-3 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const ativas = obras.filter(o => o.status === 'andamento' || o.status === 'planejamento');

  return (
    <Card className="h-full shadow-sm">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Minhas Obras</p>
        {ativas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma obra em andamento.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {ativas.map(o => {
              const atvs = atividades.filter(a => a.obra_id === o.id);
              const prog = atvs.length > 0 ? Math.round(atvs.reduce((s, a) => s + (a.percentual || 0), 0) / atvs.length) : 0;
              const diariosObra = diarios.filter(d => d.obra_id === o.id);
              const ultimoDiario = diariosObra.length > 0 ? diariosObra[0].data : null;
              const margem = o.total_receitas > 0 ? `${Math.round(((o.total_receitas - o.total_despesas) / o.total_receitas) * 100)}%` : '—';
              const borda = o.status === 'andamento' ? 'border-l-warning' : 'border-l-primary';
              return (
                <div
                  key={o.id}
                  className={`rounded-md border border-l-4 ${borda} bg-card p-3 space-y-2.5 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-semibold truncate">{o.nome}</p>
                      {o.cliente_nome && <p className="text-xs text-muted-foreground truncate">{o.cliente_nome}</p>}
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 ${o.status === 'andamento' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                      {o.status === 'andamento' ? 'Em andamento' : 'Planejamento'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progresso físico</span>
                      <span className="font-semibold">{prog}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${prog}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Recebido</p>
                      <p className="font-semibold text-success truncate"><SensitiveValue>{fmt(o.total_recebido)}</SensitiveValue></p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gasto</p>
                      <p className="font-semibold text-destructive truncate"><SensitiveValue>{fmt(o.total_despesas)}</SensitiveValue></p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margem</p>
                      <p className="font-semibold truncate"><SensitiveValue>{margem}</SensitiveValue></p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">
                      Último diário: {ultimoDiario ? ddmm(ultimoDiario) : 'sem registro'}
                    </span>
                    <button
                      onClick={() => navigate(`/obras/${o.id}`)}
                      className="text-primary font-medium hover:underline"
                    >
                      Abrir obra →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
