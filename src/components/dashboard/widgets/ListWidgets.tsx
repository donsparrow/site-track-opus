import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, ClipboardList, CalendarClock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { WidgetConfig } from '@/types/dashboard';

interface Props { config?: WidgetConfig }

export function FerramentasResumoWidget({ config }: Props) {
  const { ferramentas, loading } = useDashboardData();
  const navigate = useNavigate();
  const filtered = config?.obraId ? ferramentas.filter(f => f.obra_id === config.obraId) : ferramentas;
  const resumo = {
    total: filtered.length,
    em_uso: filtered.filter(f => f.status === 'em_uso').length,
    disponivel: filtered.filter(f => f.status === 'disponivel').length,
    manutencao: filtered.filter(f => f.status === 'manutencao').length,
    inativo: filtered.filter(f => f.status === 'inativo').length,
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2"><Wrench className="h-5 w-5" /> Ferramentas</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? <Skeleton className="h-32 w-full" /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
              <div><p className="text-muted-foreground text-xs">Total</p><p className="text-lg font-bold">{resumo.total}</p></div>
              <div><p className="text-muted-foreground text-xs">Em Uso</p><p className="text-lg font-bold text-accent">{resumo.em_uso}</p></div>
              <div><p className="text-muted-foreground text-xs">Disponíveis</p><p className="text-lg font-bold text-success">{resumo.disponivel}</p></div>
              <div><p className="text-muted-foreground text-xs">Manutenção</p><p className="text-lg font-bold text-warning">{resumo.manutencao}</p></div>
              <div><p className="text-muted-foreground text-xs">Inativas</p><p className="text-lg font-bold text-destructive">{resumo.inativo}</p></div>
            </div>
            <div className="space-y-1">
              {filtered.slice(0, 5).map(f => (
                <div key={f.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2"
                  onClick={() => navigate('/ferramentas')}>
                  <span className="truncate">{f.nome} <span className="text-muted-foreground">#{f.numero_cadastro}</span></span>
                  <Badge variant="outline" className="text-[10px] ml-2 shrink-0">{f.obra_nome || 'Sem obra'}</Badge>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma ferramenta.</p>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function UltimosDiariosWidget({ config }: Props) {
  const { diarios, loading } = useDashboardData();
  const navigate = useNavigate();
  const filtered = config?.obraId ? diarios.filter(d => d.obra_id === config.obraId) : diarios;
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Últimos Diários</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? <Skeleton className="h-24 w-full" /> : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum diário registrado.</p>
        ) : (
          <div className="space-y-1">
            {filtered.slice(0, 8).map(d => (
              <div key={d.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 px-2 rounded"
                onClick={() => navigate(`/diario?obra=${d.obra_id}`)}>
                <span className="truncate">{d.obra_nome || 'Obra'}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AtividadesPendentesWidget({ config }: Props) {
  const { atividades, loading } = useDashboardData();
  const pendentes = atividades.filter(a => a.status !== 'concluido' && (a.percentual || 0) < 100);
  const filtered = config?.obraId ? pendentes.filter(a => a.obra_id === config.obraId) : pendentes;
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Atividades Pendentes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? <Skeleton className="h-24 w-full" /> : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem atividades pendentes.</p>
        ) : (
          <div className="space-y-1">
            {filtered.slice(0, 8).map(a => (
              <div key={a.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                <span className="truncate">{a.nome}</span>
                <Badge variant="outline" className="text-[10px] ml-2 shrink-0">{a.percentual || 0}%</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AtividadesAtrasoWidget({ config }: Props) {
  const { atividades, loading } = useDashboardData();
  const today = new Date().toISOString().split('T')[0];
  const atrasadas = atividades.filter(a => a.data_fim && a.data_fim < today && a.status !== 'concluido' && (a.percentual || 0) < 100);
  const filtered = config?.obraId ? atrasadas.filter(a => a.obra_id === config.obraId) : atrasadas;
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2 text-destructive"><CalendarClock className="h-5 w-5" /> Atividades em Atraso</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? <Skeleton className="h-24 w-full" /> : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade em atraso.</p>
        ) : (
          <div className="space-y-1">
            {filtered.slice(0, 8).map(a => (
              <div key={a.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                <span className="truncate">{a.nome}</span>
                <span className="text-destructive shrink-0 ml-2">{a.data_fim && new Date(a.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
