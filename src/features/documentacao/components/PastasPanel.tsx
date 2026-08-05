import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderPlus, Folder, Pencil, Trash2 } from 'lucide-react';
import type { Pasta } from '../types';

interface Props {
  pastas: Pasta[];
  loading: boolean;
  pastaAberta: string | null;
  canManage: boolean;
  onSelect: (id: string) => void;
  onNovaPasta: () => void;
  onEditarPasta: (pasta: Pasta) => void;
  onExcluirPasta: (id: string) => void;
}

export default function PastasPanel({
  pastas,
  loading,
  pastaAberta,
  canManage,
  onSelect,
  onNovaPasta,
  onEditarPasta,
  onExcluirPasta,
}: Props) {
  return (
    <Card className="md:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Pastas</CardTitle>
        {canManage && (
          <Button size="sm" variant="outline" onClick={onNovaPasta}>
            <FolderPlus className="h-4 w-4 mr-1" /> Nova
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && pastas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma pasta criada.</p>
        )}
        {pastas.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
              pastaAberta === p.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
            }`}
            onClick={() => onSelect(p.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm truncate">{p.nome_pasta}</span>
            </div>
            {canManage && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); onEditarPasta(p); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); onExcluirPasta(p.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
