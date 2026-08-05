import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, Clock } from 'lucide-react';
import type { PrazosRelatorio } from '../types';
import { fmt, getSmartStatus } from '../utils';

export default function IndicadoresPrazo({ prazos }: { prazos: PrazosRelatorio }) {
  const smartStatus = getSmartStatus(prazos);
  const desvioPct = prazos.percentualExecutado - prazos.percentualTempo;
  const saldoColor = prazos.saldo > 0 ? 'text-success' : prazos.saldo < 0 ? 'text-destructive' : 'text-foreground';

  const linha1 = [
    { label: 'Progresso Físico Executado', value: `${prazos.percentualExecutado}%`, icon: BarChart3, color: smartStatus.color },
    { label: 'Prazo Consumido', value: `${prazos.percentualTempo}%`, icon: Clock, color: '' },
    { label: 'Desvio', value: `${desvioPct > 0 ? '+' : ''}${desvioPct}%`, icon: BarChart3, color: smartStatus.color },
    { label: 'Saldo de Prazo', value: `${prazos.saldo} dias`, icon: Clock, color: saldoColor },
  ];

  const linha2 = [
    { label: 'Início Real', value: prazos.dataInicioReal ? fmt(prazos.dataInicioReal) : 'Não iniciada', icon: Calendar, color: prazos.dataInicioReal ? '' : 'text-destructive' },
    { label: 'Dias Trabalhados', value: `${prazos.trabalhados} dias`, icon: BarChart3, color: '' },
    { label: 'Dias Parados', value: `${prazos.parados} dias`, icon: Clock, color: prazos.parados > 0 ? 'text-destructive' : '' },
    { label: 'Prazo Ajustado', value: `${prazos.ajustado} dias`, icon: Calendar, color: '' },
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
