import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, Clock } from 'lucide-react';
import type { PrazosRelatorio } from '../types';
import { fmt, getSmartStatus } from '../utils';

export default function IndicadoresPrazo({ prazos }: { prazos: PrazosRelatorio }) {
  const smartStatus = getSmartStatus(prazos);
  const desvioPct = prazos.percentualExecutado - prazos.percentualTempo;
  const novo = prazos.percentualContrato !== undefined;
  const paradosTotal = novo
    ? (prazos.paradosTotal ?? Math.max(0, prazos.ajustado - prazos.contratual))
    : Math.max(0, prazos.ajustado - prazos.contratual);
  const saldoColor = prazos.saldo > 0 ? 'text-success' : prazos.saldo < 0 ? 'text-destructive' : 'text-foreground';
  const porAditivo = novo ? prazos.progressoPorAditivo ?? [] : [];

  const linha1 = [
    { label: novo ? 'Progresso Físico (global)' : 'Progresso Físico Executado', value: `${prazos.percentualExecutado}%`, icon: BarChart3, color: smartStatus.color },
    { label: 'Prazo Consumido', value: `${prazos.percentualTempo}%`, icon: Clock, color: '' },
    { label: 'Desvio', value: `${desvioPct > 0 ? '+' : ''}${desvioPct}%`, icon: BarChart3, color: smartStatus.color },
    { label: 'Saldo de Prazo', value: `${prazos.saldo} dias`, icon: Clock, color: saldoColor },
  ];

  const inicioItem = { label: 'Início Real', value: prazos.dataInicioReal ? fmt(prazos.dataInicioReal) : 'Não iniciada', icon: Calendar, color: prazos.dataInicioReal ? '' : 'text-destructive' };
  const paradosPeriodoItem = { label: 'Dias Parados (período)', value: `${prazos.parados} dias`, icon: Clock, color: prazos.parados > 0 ? 'text-destructive' : '' };
  const paradosTotalItem = { label: 'Dias Parados (total da obra)', value: `${paradosTotal} dias`, icon: Clock, color: paradosTotal > 0 ? 'text-destructive' : '' };
  const ajustadoItem = { label: 'Prazo Ajustado', value: `${prazos.ajustado} dias`, icon: Calendar, color: '' };

  const linha2 = novo
    ? [
        inicioItem,
        { label: 'Dias Úteis Decorridos', value: `${prazos.decorridos ?? 0} dias`, icon: Calendar, color: '' },
        paradosPeriodoItem,
        paradosTotalItem,
        { label: 'Dias Úteis Trabalhados', value: `${prazos.trabalhados} dias`, icon: BarChart3, color: '' },
        ajustadoItem,
      ]
    : [
        inicioItem,
        { label: 'Dias Trabalhados', value: `${prazos.trabalhados} dias`, icon: BarChart3, color: '' },
        paradosPeriodoItem,
        paradosTotalItem,
        ajustadoItem,
      ];

  const grid = (items: typeof linha1) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
            <p className={`text-lg font-display font-bold ${item.color || ''}`}>{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-sm font-display text-muted-foreground mb-1">Prazo Contratual (dias úteis)</p>
              <span className="text-2xl font-bold">{prazos.contratual}</span>
              {(prazos.diasAditivos ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  sendo {prazos.contratualBase ?? prazos.contratual - (prazos.diasAditivos ?? 0)} contratual + {prazos.diasAditivos} de aditivo
                </p>
              )}
            </div>
            <span className="text-sm text-muted-foreground">(definido na aba Obras)</span>
            {prazos.dataInicioReal ? (
              <Badge variant="outline" className="text-xs">Início real: {fmt(prazos.dataInicioReal)}</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Obra ainda não iniciada</Badge>
            )}
          </div>
        </CardContent>
      </Card>
      {grid(linha1)}
      {grid(linha2)}
    </>
  );
}
