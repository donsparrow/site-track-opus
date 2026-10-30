import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { ProgressoPorAditivo } from '@/lib/prazoObra';

interface Props {
  progressoGlobal: number;
  progressoContrato: number;
  progressoPorAditivo: ProgressoPorAditivo[];
  atividadesAditivoSemVinculo: number;
  obraConcluida: boolean;
  totalPeso: number;
  pesoValido: boolean;
  temAtividades: boolean;
  temAditivos?: boolean;
}

const pct = (n: number) => Math.min(Math.max(n, 0), 100);

export default function ProgressoGeralCard({
  progressoGlobal, progressoContrato, progressoPorAditivo, atividadesAditivoSemVinculo, obraConcluida,
  totalPeso, pesoValido, temAtividades, temAditivos,
}: Props) {
  const comAditivos = !!temAditivos && progressoPorAditivo.length > 0;

  const pesoBadge = temAtividades && (pesoValido ? (
    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
      Pesos originais: 100% ✓
    </Badge>
  ) : (
    <Badge variant="destructive" className="text-[10px] gap-1">
      <AlertTriangle className="h-3 w-3" />
      Pesos originais: {totalPeso}% (devem somar 100%)
    </Badge>
  ));

  const alertaSemVinculo = !obraConcluida && atividadesAditivoSemVinculo > 0 && (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        {atividadesAditivoSemVinculo} atividade(s) de aditivo sem vínculo — não entram no progresso. Edite e vincule a um aditivo.
      </span>
    </div>
  );

  if (!comAditivos) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">Progresso da Obra</span>
              {pesoBadge}
            </div>
            <span className="text-sm font-bold text-primary">{progressoContrato}%</span>
          </div>
          <Progress value={progressoContrato} className="h-4" />
          <p className="text-xs text-muted-foreground mt-2">
            Escopo original concluído: {progressoContrato}%
            {totalPeso > 0 && ' (ponderado pelos pesos das atividades originais)'}
            {totalPeso === 0 && temAtividades && ' (média simples — sem pesos nas atividades originais)'}
          </p>
          {alertaSemVinculo}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progresso Global da Obra</span>
          <span className="text-sm font-bold text-primary">{progressoGlobal}%</span>
        </div>
        <Progress value={progressoGlobal} className="h-4" />
        <p className="text-xs text-muted-foreground mt-2">Contrato + aditivos, ponderado pelo prazo de cada um.</p>

        <div className="mt-4 pt-3 border-t space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-foreground">Contrato original</span>
                {pesoBadge}
              </div>
              <span className="text-xs font-bold text-primary">{progressoContrato}%</span>
            </div>
            <Progress value={progressoContrato} className="h-2" />
          </div>
          {progressoPorAditivo.map((a, i) => (
            <div key={a.id}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-medium text-foreground">
                  Aditivo {i + 1}{a.descricao ? ` — ${a.descricao}` : ''} (+{a.dias} dias)
                </span>
                <span className="text-xs font-bold text-warning">{a.progresso}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-warning/15">
                <div className="h-full bg-warning transition-all" style={{ width: `${pct(a.progresso)}%` }} />
              </div>
            </div>
          ))}
        </div>
        {alertaSemVinculo}
      </CardContent>
    </Card>
  );
}
