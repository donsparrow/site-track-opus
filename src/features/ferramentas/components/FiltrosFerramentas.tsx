import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { STATUS_CONFIG, TIPO_LABELS, type ObraOption } from '../types';

interface Props {
  obras: ObraOption[];
  filtroObra: string;
  setFiltroObra: (v: string) => void;
  filtroStatus: string;
  setFiltroStatus: (v: string) => void;
  filtroTipo: string;
  setFiltroTipo: (v: string) => void;
  busca: string;
  setBusca: (v: string) => void;
}

export default function FiltrosFerramentas({
  obras,
  filtroObra,
  setFiltroObra,
  filtroStatus,
  setFiltroStatus,
  filtroTipo,
  setFiltroTipo,
  busca,
  setBusca,
}: Props) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou número..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroObra} onValueChange={setFiltroObra}>
            <SelectTrigger><SelectValue placeholder="Obra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as obras</SelectItem>
              {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
