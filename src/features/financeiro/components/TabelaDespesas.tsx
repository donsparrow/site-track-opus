import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Trash2, Upload } from 'lucide-react';
import type { AnexoPreviewTarget } from '@/components/AnexoPreviewDialog';
import AnexosInline from './AnexosInline';
import { fmt, fmtData, tipoLabels } from '../utils';
import type { DespesaComObra, FinanceiroAnexo } from '../types';

interface Props {
  despesas: DespesaComObra[];
  anexos: FinanceiroAnexo[];
  canEdit: boolean;
  isAdmin: boolean;
  onNovaDespesa: () => void;
  onEditarDespesa: (d: DespesaComObra) => void;
  onExcluirDespesa: (id: string) => void;
  onAnexar: (registroId: string) => void;
  onPreviewAnexo: (target: AnexoPreviewTarget) => void;
}

export default function TabelaDespesas({
  despesas, anexos, canEdit, isAdmin, onNovaDespesa, onEditarDespesa, onExcluirDespesa, onAnexar, onPreviewAnexo,
}: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-display font-semibold">Despesas</h2>
        {canEdit && (
          <Button onClick={onNovaDespesa} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> Nova Despesa
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pgto</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Manutenção ID</TableHead>
                <TableHead>Anexos</TableHead>
                {canEdit && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.descricao}</TableCell>
                  <TableCell>{d.obras?.nome || '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{tipoLabels[d.tipo] || d.tipo}</Badge></TableCell>
                  <TableCell className="data-tech text-destructive font-medium">{fmt(Number(d.valor))}</TableCell>
                  <TableCell className="data-tech">{fmtData(d.data)}</TableCell>
                  <TableCell className="data-tech">{fmtData(d.data_vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={d.tipo_pagamento === 'prazo' ? 'outline' : 'secondary'}>
                      {d.tipo_pagamento === 'prazo' ? 'A Prazo' : 'À Vista'}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{d.forma_pagamento || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {d.manutencao_id ? String(d.manutencao_id).substring(0, 8) + '…' : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <AnexosInline anexos={anexos} registroId={d.id} tipoRegistro="despesa" onPreview={onPreviewAnexo} />
                      {canEdit && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 ml-1" onClick={() => onAnexar(d.id)} title="Anexar arquivo">
                          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditarDespesa(d)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => onExcluirDespesa(d.id)} title="Excluir">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {despesas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 11 : 10} className="text-center py-8 text-muted-foreground">
                    Nenhuma despesa cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
