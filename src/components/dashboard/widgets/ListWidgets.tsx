import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, ClipboardList, CalendarClock, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { WidgetConfig } from '@/types/dashboard';

interface Props { config?: WidgetConfig }

const CARD_CLASS = 'h-full flex flex-col shadow-sm hover:shadow-md transition-shadow';
const TITLE_CLASS = 'text-sm font-display font-semibold flex items-center gap-2';

function EmptyLine({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
      <Inbox className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function FerramentasResumoWidget({ config }: Props) {
  const { ferramentas, loading } = useDashboardData();
  const navigate = useNavigate();
  const filtered = config?.obraId ? ferramentas.filter(f => f.obra_id === config.obraId) : ferramentas;
  const resumo = [
    { label: 'Total', value: filtered.length, color: 'text-foreground' },
    { label: 'Em Uso', value: filtered.filter(f => f.status === 'em_uso').length, color: 'text-accent' },
    { label: 'Disponíveis', value: filtered.filter(f => f.status === 'disponivel').length, color: 'text-success' },
    { label: 'Manutenção', value: filtered.filter(f => f.status === 'manutencao').length, color: 'text-warning' },
    { label: 'Inativas', value: filtered.filter(f => f.status === 'inativo').length, color: 'text-destructive' },
  ];

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className={TITLE_CLASS}><Wrench className="h-4 w-4" /> Ferramentas</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/ferramentas')}>Gerenciar</Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex items-center">
        {loading ? <Skeleton className="h-16 w-full" /> : filtered.length === 0 ? (
          <EmptyLine>Nenhuma ferramenta cadastrada.</EmptyLine>
        ) : (
          <div className="w-full grid grid-cols-3 sm:grid-cols-5 divide-x divide-border">
            {resumo.map(r => (
              <div key={r.label} className="px-2 text-center first:pl-0 last:pr-0">
                <p className={`text-xl font-display font-bold ${r.color}`}>{r.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{r.label}</p>
              </div>
            ))}
          </div>
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
    <Card className={CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className={TITLE_CLASS}><ClipboardList className="h-4 w-4" /> Últimos Diários</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? <Skeleton className="h-16 w-full" /> : filtered.length === 0 ? (
          <EmptyLine>Nenhum diário recente.</EmptyLine>
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
    <Card className={CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className={TITLE_CLASS}><CalendarClock className="h-4 w-4" /> Atividades Pendentes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? <Skeleton className="h-16 w-full" /> : filtered.length === 0 ? (
          <EmptyLine>Sem atividades pendentes.</EmptyLine>
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
    <Card className={CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className={`${TITLE_CLASS} text-destructive`}><CalendarClock className="h-4 w-4" /> Atividades em Atraso</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? <Skeleton className="h-16 w-full" /> : filtered.length === 0 ? (
          <EmptyLine>Nenhuma atividade em atraso.</EmptyLine>
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
