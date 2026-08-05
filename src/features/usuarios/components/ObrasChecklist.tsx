import { Checkbox } from '@/components/ui/checkbox';
import type { ObraOption } from '../types';

interface Props {
  obras: ObraOption[];
  selecionadas: string[];
  onToggle: (obraId: string) => void;
}

export default function ObrasChecklist({ obras, selecionadas, onToggle }: Props) {
  if (obras.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada</p>;
  }
  return (
    <>
      {obras.map(obra => (
        <label key={obra.id} className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={selecionadas.includes(obra.id)}
            onCheckedChange={() => onToggle(obra.id)}
          />
          <span className="text-sm">{obra.nome}</span>
        </label>
      ))}
    </>
  );
}
