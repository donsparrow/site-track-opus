import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GanttData } from '../pdf';

interface Props {
  ganttData: GanttData | null;
}

export default function GanttCard({ ganttData }: Props) {
  if (!ganttData) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Gráfico de Gantt</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Timeline header */}
            <div className="flex items-center border-b border-border pb-2 mb-2">
              <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground">Atividade</div>
              <div className="flex-1 flex justify-between text-xs text-muted-foreground">
                <span>{format(ganttData.minDate, 'dd/MM', { locale: ptBR })}</span>
                <span>{format(addDays(ganttData.minDate, Math.floor(ganttData.totalDays / 2)), 'dd/MM', { locale: ptBR })}</span>
                <span>{format(ganttData.maxDate, 'dd/MM', { locale: ptBR })}</span>
              </div>
            </div>
            {/* Bars */}
            {ganttData.validAtivs.map(a => {
              const start = differenceInDays(parseISO(a.data_inicio!), ganttData.minDate);
              const duration = Math.max(differenceInDays(parseISO(a.data_fim!), parseISO(a.data_inicio!)), 1);
              const leftPct = (start / ganttData.totalDays) * 100;
              const widthPct = Math.max((duration / ganttData.totalDays) * 100, 2);
              return (
                <div key={a.id} className="flex items-center mb-1.5">
                  <div className="w-48 shrink-0 text-xs truncate pr-2 text-foreground">
                    {a.nome_atividade}
                    <span className="text-muted-foreground ml-1">({a.peso}%)</span>
                  </div>
                  <div className="flex-1 relative h-7 bg-muted/30 rounded">
                    <div
                      className="absolute top-0 h-full bg-blue-100 dark:bg-blue-900/40 rounded"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    >
                      <div
                        className="h-full bg-primary rounded transition-all"
                        style={{ width: `${a.percentual_concluido}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
                        {a.percentual_concluido}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
