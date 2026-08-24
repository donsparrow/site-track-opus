import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowUp, ArrowDown, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Atividade } from '../types';
import { statusColors, statusLabels } from '../types';

type SortColumn = 'ordem' | 'nome_atividade' | 'peso' | 'data_inicio' | 'data_fim' | 'percentual_concluido' | 'status';
type SortDirection = 'asc' | 'desc';

interface Props {
  atividades: Atividade[];
  totalPeso: number;
  pesoValido: boolean;
  canEdit: boolean;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onEdit: (a: Atividade) => void;
  onDelete: (id: string) => void;
}

export default function AtividadesCard({ atividades, totalPeso, pesoValido, canEdit, onMove, onEdit, onDelete }: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('ordem');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const isDefaultOrder = sortColumn === 'ordem' && sortDirection === 'asc';

  const sortedAtividades = useMemo(() => {
    const sorted = [...atividades].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortColumn) {
        case 'ordem': valA = a.ordem; valB = b.ordem; break;
        case 'nome_atividade': valA = (a.nome_atividade || '').toLowerCase(); valB = (b.nome_atividade || '').toLowerCase(); break;
        case 'peso': valA = a.peso || 0; valB = b.peso || 0; break;
        case 'data_inicio': valA = a.data_inicio || ''; valB = b.data_inicio || ''; break;
        case 'data_fim': valA = a.data_fim || ''; valB = b.data_fim || ''; break;
        case 'percentual_concluido': valA = a.percentual_concluido; valB = b.percentual_concluido; break;
        case 'status': valA = a.status; valB = b.status; break;
        default: valA = a.ordem; valB = b.ordem;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [atividades, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn('ordem');
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ column, label, className }: { column: SortColumn; label: string; className?: string }) => (
    <TableHead
      className={cn('cursor-pointer hover:bg-muted/50 select-none', className)}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column ? (
          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
      </div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Atividades</CardTitle>
        {!isDefaultOrder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSortColumn('ordem'); setSortDirection('asc'); }}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Voltar à ordem padrão
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {atividades.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhuma atividade cadastrada. Clique em "Atividade" para começar.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="ordem" label="#" className="w-12" />
                  <SortableHeader column="nome_atividade" label="Atividade" />
                  <SortableHeader column="peso" label="Peso" className="w-20" />
                  <SortableHeader column="data_inicio" label="Início" />
                  <SortableHeader column="data_fim" label="Fim" />
                  <SortableHeader column="percentual_concluido" label="Progresso" />
                  <SortableHeader column="status" label="Status" />
                  {canEdit && <TableHead className="w-32">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAtividades.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{isDefaultOrder ? i + 1 : a.ordem}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{a.nome_atividade}</span>
                        {(a.tipo_atividade || 'original') === 'aditivo' && (
                          <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300">ADITIVO</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{a.peso}%</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.data_inicio ? format(parseISO(a.data_inicio), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-sm">{a.data_fim ? format(parseISO(a.data_fim), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={a.percentual_concluido} className="h-2 w-16" />
                        <span className="text-xs font-medium">{a.percentual_concluido}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={statusColors[a.status]}>{statusLabels[a.status] || a.status}</Badge></TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onMove(a.id, 'up')}
                            disabled={i === 0 || !isDefaultOrder}
                            title={isDefaultOrder ? undefined : 'Volte à ordem padrão para reordenar'}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onMove(a.id, 'down')}
                            disabled={i === sortedAtividades.length - 1 || !isDefaultOrder}
                            title={isDefaultOrder ? undefined : 'Volte à ordem padrão para reordenar'}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(a)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell></TableCell>
                  <TableCell className="font-bold text-sm">TOTAL</TableCell>
                  <TableCell>
                    <Badge variant={pesoValido ? 'default' : 'destructive'} className="text-xs">
                      {totalPeso}%
                    </Badge>
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                  {canEdit && <TableCell></TableCell>}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
