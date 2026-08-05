import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ObraOption } from '../types';

interface Props {
  obras: ObraOption[];
  onSelect: (obraId: string) => void;
}

export default function SelecionarObraCard({ obras, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Cronograma de Obra</h1>
      <Card>
        <CardContent className="pt-6">
          <Label>Selecione a Obra</Label>
          <Select onValueChange={onSelect}>
            <SelectTrigger><SelectValue placeholder="Escolha uma obra" /></SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
