import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Plus, Upload } from 'lucide-react';
import type { ObraOption } from '../types';

interface Props {
  obraNome: string;
  obraId: string;
  obras: ObraOption[];
  canEdit: boolean;
  onSelectObra: (id: string) => void;
  onExportPdf: () => void;
  onNovoAditivo: () => void;
  onImportar: () => void;
  onNovaAtividade: () => void;
}

export default function CronogramaHeader({
  obraNome, obraId, obras, canEdit,
  onSelectObra, onExportPdf, onNovoAditivo, onImportar, onNovaAtividade,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cronograma</h1>
        <p className="text-sm text-muted-foreground">{obraNome}</p>
      </div>
      <div className="flex gap-2">
        <Select value={obraId} onValueChange={onSelectObra}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onExportPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
        {canEdit && <Button variant="outline" onClick={onNovoAditivo}><Plus className="h-4 w-4 mr-1" />Aditivo</Button>}
        {canEdit && <Button variant="outline" onClick={onImportar}><Upload className="h-4 w-4 mr-1" />Importar Cronograma</Button>}
        {canEdit && <Button onClick={onNovaAtividade}><Plus className="h-4 w-4 mr-1" />Atividade</Button>}
      </div>
    </div>
  );
}
