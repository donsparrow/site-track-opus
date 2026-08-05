import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, Pencil, Trash2, History } from 'lucide-react';
import { STATUS_CONFIG, TIPO_LABELS, type Ferramenta, type ObraOption } from '../types';

interface Props {
  ferramentas: Ferramenta[];
  obras: ObraOption[];
  canEdit: boolean;
  onEdit: (f: Ferramenta) => void;
  onDelete: (id: string) => void;
  onManutencao: (id: string) => void;
  onHistorico: (id: string) => void;
  onStatusChange: (ferramenta: Ferramenta, novoStatus: string) => void;
  onObraChange: (ferramenta: Ferramenta, novaObraId: string | null) => void;
}

export default function TabelaFerramentas({
  ferramentas,
  obras,
  canEdit,
  onEdit,
  onDelete,
  onManutencao,
  onHistorico,
  onStatusChange,
  onObraChange,
}: Props) {
  if (ferramentas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Nenhuma ferramenta encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nº Cadastro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Obra Atual</TableHead>
                <TableHead>Última Manutenção</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ferramentas.map((f) => {
                const obraNome = obras.find((o) => o.id === f.obra_id)?.nome || '—';
                const sc = STATUS_CONFIG[f.status] || { label: f.status, color: 'bg-muted' };
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="data-tech">{f.numero_cadastro}</TableCell>
                    <TableCell>
                      {(TIPO_LABELS[f.tipo] || f.tipo) + (f.tipo === 'eletrica' && f.voltagem ? ` · ${f.voltagem}` : '')}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={f.status} onValueChange={(newStatus) => onStatusChange(f, newStatus)}>
                          <SelectTrigger className="w-[140px] h-8">
                            <Badge variant="outline" className="gap-1.5 border-0">
                              <span className={`h-2 w-2 rounded-full ${sc.color}`} />
                              {sc.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                <span className="flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${v.color}`} />
                                  {v.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${sc.color}`} />
                          {sc.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={f.obra_id || 'nenhuma'}
                          onValueChange={(newObraId) => onObraChange(f, newObraId === 'nenhuma' ? null : newObraId)}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue>{obraNome}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nenhuma">Sem obra</SelectItem>
                            {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{obraNome}</span>
                      )}
                    </TableCell>
                    <TableCell className="data-tech">
                      {f.ultima_manutencao
                        ? new Date(f.ultima_manutencao + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <Button size="icon" variant="ghost" title="Registrar manutenção" onClick={() => onManutencao(f.id)}>
                              <Wrench className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Editar" onClick={() => onEdit(f)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Excluir" onClick={() => onDelete(f.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" title="Histórico" onClick={() => onHistorico(f.id)}>
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
