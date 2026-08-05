import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Sun, Trash2 } from 'lucide-react';
import { climaIcons, climaLabels, fmtData } from '../utils';
import type { Diario } from '../types';

interface Props {
  diarios: Diario[];
  loading: boolean;
  selectedId: string | null;
  canEditDelete: boolean;
  onSelect: (d: Diario) => void;
  onEdit: (d: Diario) => void;
  onDelete: (id: string) => void;
}

export function ListaDiarios({ diarios, loading, selectedId, canEditDelete, onSelect, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (diarios.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum diário registrado</p>;
  }

  return (
    <>
      {diarios.map((d) => {
        const Icon = climaIcons[d.clima] || Sun;
        return (
          <div
            key={d.id}
            onClick={() => onSelect(d)}
            className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
              selectedId === d.id ? 'bg-accent/10 border-accent' : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="data-tech font-medium text-sm">{fmtData(d.data)}</span>
              <Badge variant="secondary" className="text-xs ml-auto">{climaLabels[d.clima]}</Badge>
            </div>
            {d.horario_inicio && d.horario_fim && (
              <p className="data-tech text-xs text-muted-foreground mt-1">
                {d.horario_inicio.slice(0, 5)} - {d.horario_fim.slice(0, 5)}
              </p>
            )}
            {canEditDelete && (
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); onEdit(d); }}
                >
                  <Pencil className="h-3 w-3 mr-1" />Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />Excluir
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
