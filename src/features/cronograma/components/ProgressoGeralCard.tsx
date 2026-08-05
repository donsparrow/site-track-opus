import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Props {
  progressoGeral: number;
  totalPeso: number;
  pesoValido: boolean;
  temAtividades: boolean;
}

export default function ProgressoGeralCard({ progressoGeral, totalPeso, pesoValido, temAtividades }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Progresso da Obra</span>
            {temAtividades && !pesoValido && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                Pesos: {totalPeso}% (devem somar 100%)
              </Badge>
            )}
            {temAtividades && pesoValido && (
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                Pesos: 100% ✓
              </Badge>
            )}
          </div>
          <span className="text-sm font-bold text-primary">{progressoGeral}%</span>
        </div>
        <Progress value={progressoGeral} className="h-4" />
        <p className="text-xs text-muted-foreground mt-2">
          Obra concluída: {progressoGeral}%
          {totalPeso > 0 && totalPeso !== 100 && ' (cálculo baseado em média simples — ajuste os pesos para 100%)'}
          {pesoValido && ' (cálculo ponderado por peso)'}
        </p>
      </CardContent>
    </Card>
  );
}
