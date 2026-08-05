import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  prazoAtual: number;
  onSave: (dias: number) => void;
}

export function PrazoContratualCard({ prazoAtual, onSave }: Props) {
  const [prazo, setPrazo] = useState(prazoAtual);

  useEffect(() => setPrazo(prazoAtual), [prazoAtual]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-4">
          <Label className="whitespace-nowrap text-sm font-medium">Prazo Contratual (dias úteis):</Label>
          <Input
            type="number"
            min={1}
            className="w-32"
            value={prazo || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setPrazo(val >= 1 ? val : 0);
            }}
            onBlur={() => { if (prazo >= 1 && prazo !== prazoAtual) onSave(prazo); }}
            placeholder="Dias"
          />
          <span className="text-xs text-muted-foreground">
            {prazo > 0 ? `${prazo} dias` : 'Não definido'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
