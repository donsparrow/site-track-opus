import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Atividade } from '../types';
import { statusColors, statusLabels } from '../types';

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
  return (
    <Card>
      <CardHeader><CardTitle>Atividades</CardTitle></CardHeader>
      <CardContent>
        {atividades.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhuma atividade cadastrada. Clique em "Atividade" para começar.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead className="w-20">Peso</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-32">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {atividades.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
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
                          <Button variant="ghost" size="icon" onClick={() => onMove(a.id, 'up')} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => onMove(a.id, 'down')} disabled={i === atividades.length - 1}><ArrowDown className="h-3 w-3" /></Button>
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
