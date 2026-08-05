import { Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import type { AnexoPreviewTarget } from '@/components/AnexoPreviewDialog';
import AnexosInline from './AnexosInline';
import { fmt, fmtData, statusParcela } from '../utils';
import { useParcelas } from '../hooks/useParcelas';
import type { FinanceiroAnexo, Parcela, ReceitaComObra } from '../types';

interface Props {
  receitas: ReceitaComObra[];
  anexos: FinanceiroAnexo[];
  canEdit: boolean;
  isAdmin: boolean;
  expandedReceita: string | null;
  onToggleReceita: (id: string) => void;
  onNovaReceita: () => void;
  onEditarReceita: (r: ReceitaComObra) => void;
  onExcluirReceita: (id: string) => void;
  onEditarParcela: (p: Parcela) => void;
  onExcluirParcela: (p: Parcela) => void;
  onReceberParcela: (p: Parcela) => void;
  onAnexar: (registroId: string) => void;
  onPreviewAnexo: (target: AnexoPreviewTarget) => void;
}

export default function TabelaReceitas({
  receitas, anexos, canEdit, isAdmin, expandedReceita, onToggleReceita, onNovaReceita,
  onEditarReceita, onExcluirReceita, onEditarParcela, onExcluirParcela, onReceberParcela,
  onAnexar, onPreviewAnexo,
}: Props) {
  const { parcelas } = useParcelas(expandedReceita);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-display font-semibold">Receitas</h2>
        {canEdit && (
          <Button onClick={onNovaReceita} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> Nova Receita
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Anexos</TableHead>
                {canEdit && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitas.map((r) => (
                <Fragment key={r.id}>
                  <TableRow className="cursor-pointer" onClick={() => onToggleReceita(r.id)}>
                    <TableCell>
                      {expandedReceita === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell>{r.obras?.nome || '—'}</TableCell>
                    <TableCell className="text-success font-medium">{fmt(Number(r.valor_total))}</TableCell>
                    <TableCell className="capitalize">{r.forma_pagamento}</TableCell>
                    <TableCell>{r.numero_parcelas}x</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AnexosInline anexos={anexos} registroId={r.id} tipoRegistro="receita" onPreview={onPreviewAnexo} />
                        {canEdit && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 ml-1"
                            onClick={(e) => { e.stopPropagation(); onAnexar(r.id); }} title="Anexar arquivo">
                            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); onEditarReceita(r); }} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); onExcluirReceita(r.id); }} title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedReceita === r.id && (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 8 : 7} className="bg-muted/50 p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nº</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Vencimento</TableHead>
                              <TableHead>Recebimento</TableHead>
                              <TableHead>Forma Pgto</TableHead>
                              <TableHead>Status</TableHead>
                              {canEdit && <TableHead>Ações</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parcelas.map((p) => {
                              const st = statusParcela(p);
                              return (
                                <TableRow key={p.id} className={st === 'atrasado' ? 'bg-destructive/5' : ''}>
                                  <TableCell>{p.numero_parcela}</TableCell>
                                  <TableCell>{fmt(Number(p.valor))}</TableCell>
                                  <TableCell>{fmtData(p.data_vencimento)}</TableCell>
                                  <TableCell>{fmtData(p.data_recebimento)}</TableCell>
                                  <TableCell className="capitalize">{p.forma_pagamento || '—'}</TableCell>
                                  <TableCell>
                                    {st === 'recebido' && <Badge className="bg-success text-success-foreground">Recebido</Badge>}
                                    {st === 'atrasado' && <Badge variant="destructive">Atrasado</Badge>}
                                    {st === 'pendente' && <Badge variant="secondary">Pendente</Badge>}
                                  </TableCell>
                                  {canEdit && (
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        {st !== 'recebido' && (
                                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReceberParcela(p)}>
                                            <Check className="h-3 w-3 mr-1" /> Receber
                                          </Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditarParcela(p)} title="Editar">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        {isAdmin && (
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => onExcluirParcela(p)} title="Excluir">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {receitas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    Nenhuma receita cadastrada
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
