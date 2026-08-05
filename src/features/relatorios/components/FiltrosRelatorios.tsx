import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import type { ObraRelatorio } from '../types';

interface Props {
  obras: ObraRelatorio[];
  filtroObra: string;
  filtroStatus: string;
  onFiltroObra: (v: string) => void;
  onFiltroStatus: (v: string) => void;
  onLimpar: () => void;
}

export default function FiltrosRelatorios({ obras, filtroObra, filtroStatus, onFiltroObra, onFiltroStatus, onLimpar }: Props) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Filtrar por Obra</Label>
            <Select value={filtroObra} onValueChange={onFiltroObra}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Filtrar por Status</Label>
            <Select value={filtroStatus} onValueChange={onFiltroStatus}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={onLimpar}>
            <Filter className="h-4 w-4 mr-2" />Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
