import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Edit, Eye, Trash2 } from 'lucide-react';
import type { RelatorioComObra } from '../types';
import { fmt, statusVariant } from '../utils';

interface Props {
  relatorios: RelatorioComObra[];
  podeEditar: boolean;
  podeExcluir: boolean;
  onBaixar: (r: RelatorioComObra) => void;
  onVisualizar: (r: RelatorioComObra) => void;
  onEditar: (r: RelatorioComObra) => void;
  onExcluir: (r: RelatorioComObra) => void;
}

export default function RelatoriosLista({ relatorios, podeEditar, podeExcluir, onBaixar, onVisualizar, onEditar, onExcluir }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        {relatorios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum relatório encontrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorios.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.obras?.nome || '—'}</TableCell>
                  <TableCell>{r.obras?.clientes?.nome || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {r.data_inicio ? fmt(r.data_inicio) : '—'} a {r.data_fim ? fmt(r.data_fim) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{(r.status || '').toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {((r.revisao_pdf || 0) > 0 || r.status === 'assinado') && (
                        <Button size="sm" variant="ghost" onClick={() => onBaixar(r)} title="Baixar PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onVisualizar(r)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {podeEditar && (
                        <Button size="sm" variant="ghost" onClick={() => onEditar(r)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {podeExcluir && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Relatório</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este relatório?
                                <br />
                                <strong>{r.obras?.nome}</strong> — {r.data_inicio ? fmt(r.data_inicio) : '—'} a {r.data_fim ? fmt(r.data_fim) : '—'}
                                <br /><br />
                                O relatório será removido da lista, mas o histórico será preservado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onExcluir(r)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
