import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';
import { useCabecalhoObra } from '../hooks/useCabecalhoObra';
import { fmtDataCurta } from '../utils';
import type { ObraPainel } from '../hooks/useObrasPainel';

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  andamento: 'Em andamento',
  concluida: 'Concluída',
};

export default function CabecalhoObraCard({ obra }: { obra: ObraPainel }) {
  const { indicadores: ind, previsaoTermino, isLoading, isError } = useCabecalhoObra(obra.id);
  const concluida = obra.status === 'concluida';

  return (
    <Card>
      <CardContent className="p-5 md:p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl md:text-2xl font-bold break-words">{obra.nome}</h2>
            {obra.endereco && (
              <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />{obra.endereco}</p>
            )}
          </div>
          <Badge variant="outline" className={concluida ? 'border-success text-success' : 'border-accent text-accent'}>
            {statusLabels[obra.status] ?? obra.status}
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Não foi possível carregar o andamento da obra agora.</p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Progresso real</span><span className="data-tech font-semibold">{ind.progressoGlobal}%</span></div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={ind.progressoGlobal} aria-label="Progresso real">
                  <div className="h-full bg-accent" style={{ width: `${Math.min(100, ind.progressoGlobal)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Previsto (prazo consumido)</span><span className="data-tech">{ind.prazoConsumido}%</span></div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={ind.prazoConsumido} aria-label="Previsto">
                  <div className="h-full bg-primary/60" style={{ width: `${Math.min(100, ind.prazoConsumido)}%` }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Prazo consumido</p>
                <p className="font-semibold data-tech">{ind.diasConsumidos} de {ind.prazoEfetivo} dias úteis</p>
                <p className="text-xs text-muted-foreground">{ind.diasParados} {ind.diasParados === 1 ? 'dia parado' : 'dias parados'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Previsão de término</p>
                <p className="font-semibold data-tech">{fmtDataCurta(previsaoTermino)}</p>
                {ind.diasAditivos > 0 && <p className="text-xs text-muted-foreground">inclui {ind.diasAditivos} dias de aditivos</p>}
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Situação</p>
                <p className={`font-semibold ${ind.statusObra.color}`}>{ind.statusObra.label}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
