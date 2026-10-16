import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Props {
  progressoGeral: number;
  totalPeso: number;
  pesoValido: boolean;
  temAtividades: boolean;
  temAditivos?: boolean;
  progressoAditivos?: number;
}

export default function ProgressoGeralCard({ progressoGeral, totalPeso, pesoValido, temAtividades, temAditivos, progressoAditivos = 0 }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Progresso da Obra (escopo original)</span>
            {temAtividades && !pesoValido && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                Pesos originais: {totalPeso}% (devem somar 100%)
              </Badge>
            )}
            {temAtividades && pesoValido && (
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                Pesos originais: 100% ✓
              </Badge>
            )}
          </div>
          <span className="text-sm font-bold text-primary">{progressoGeral}%</span>
        </div>
        <Progress value={progressoGeral} className="h-4" />
        <p className="text-xs text-muted-foreground mt-2">
          Escopo original concluído: {progressoGeral}%
          {totalPeso > 0 && ' (ponderado pelos pesos das atividades originais)'}
          {totalPeso === 0 && temAtividades && ' (média simples — sem pesos nas atividades originais)'}
        </p>
        {temAditivos && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Progresso dos Aditivos</span>
                <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">Aditivo</Badge>
              </div>
              <span className="text-sm font-bold text-warning">{progressoAditivos}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-warning/15">
              <div className="h-full bg-warning transition-all" style={{ width: `${Math.min(Math.max(progressoAditivos, 0), 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Medido à parte — não entra no % do escopo original.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
