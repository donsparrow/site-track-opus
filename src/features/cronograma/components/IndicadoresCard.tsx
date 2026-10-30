import { Card, CardContent } from '@/components/ui/card';

export interface StatusObra {
  label: string;
  color: string;
  dot: string;
  cls: string;
}

interface Props {
  planejamentoConfigurado: boolean;
  statusObra: StatusObra;
  progressoGlobal: number;
  prazoConsumido: number;
  desvio: number;
  diasDecorridos: number;
  prazoEfetivo: number;
  diasAditivos: number;
  diasParados: number;
  diasConsumidos: number;
  diasSemDiario: string[];
}

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default function IndicadoresCard({
  planejamentoConfigurado, statusObra, progressoGlobal, prazoConsumido, desvio, diasDecorridos, prazoEfetivo, diasAditivos,
  diasParados, diasConsumidos, diasSemDiario,
}: Props) {
  return (
    <Card className={`border ${statusObra.cls}`}>
      <CardContent className="pt-6">
        {!planejamentoConfigurado ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">⚪</p>
            <p className="font-bold text-base text-muted-foreground">Planejamento não configurado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre atividades no Cronograma para habilitar o cálculo de progresso, prazo consumido, desvio e status.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{statusObra.dot}</span>
                <div>
                  <p className={`font-bold text-lg ${statusObra.color}`}>{statusObra.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Executado: {progressoGlobal}% • Prazo Consumido: {prazoConsumido}% • Desvio: {desvio > 0 ? '+' : ''}{desvio}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 md:gap-4 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Executado (global)</p>
                  <p className="text-sm font-bold">{progressoGlobal}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Prazo</p>
                  <p className="text-sm font-bold">{prazoConsumido}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Desvio</p>
                  <p className={`text-sm font-bold ${statusObra.color}`}>{desvio > 0 ? '+' : ''}{desvio}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Dias úteis consumidos</p>
                  <p className="text-sm font-bold">{diasConsumidos}/{prazoEfetivo || '—'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {diasDecorridos} decorridos − {diasParados} parados
                    {diasAditivos > 0 && ` • inclui +${diasAditivos} de aditivo`}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-20 text-muted-foreground">Planejado</span>
                <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${Math.min(prazoConsumido, 100)}%` }} />
                </div>
                <span className="w-10 text-right font-medium">{prazoConsumido}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-20 text-muted-foreground">Executado</span>
                <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                  <div className={`h-full ${desvio > 5 ? 'bg-success' : desvio >= -5 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${Math.min(progressoGlobal, 100)}%` }} />
                </div>
                <span className="w-10 text-right font-medium">{progressoGlobal}%</span>
              </div>
            </div>
            {diasSemDiario.length > 0 && (
              <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                ⚠ {diasSemDiario.length} dia(s) útil(eis) sem diário registrado:{' '}
                {diasSemDiario.slice(0, 10).map(ddmm).join(', ')}
                {diasSemDiario.length > 10 && ` e mais ${diasSemDiario.length - 10}`}.
                {' '}Esses dias contam como prazo consumido.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
