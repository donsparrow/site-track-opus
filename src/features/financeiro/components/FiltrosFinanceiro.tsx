import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ObraOption } from '../types';

interface Props {
  obras: ObraOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function FiltrosFinanceiro({ obras, value, onChange }: Props) {
  return (
    <div className="mb-6 max-w-xs">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Filtrar por obra" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as obras</SelectItem>
          {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
