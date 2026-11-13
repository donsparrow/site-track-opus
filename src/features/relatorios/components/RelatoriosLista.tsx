import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Edit, Eye, Trash2, PenTool } from 'lucide-react';
import type { RelatorioComObra } from '../types';
import type { StatusLiberacao } from '../pdfArquivado';
import { fmt, revLabel, statusVariant } from '../utils';
import { formatarNumero, type InfoListaRelatorio } from '../nomeArquivo';

interface Props {
  relatorios: RelatorioComObra[];
  podeEditar: boolean;
  liberacoes?: Record<string, StatusLiberacao>;
  podeExcluir: boolean;
  mostrarPendenciaEmpresa?: boolean;
  cliente?: { userId?: string };
  onAssinar?: (r: RelatorioComObra) => void;
  onBaixar: (r: RelatorioComObra) => void;
  onVisualizar: (r: RelatorioComObra) => void;
  onEditar: (r: RelatorioComObra) => void;
  onExcluir: (r: RelatorioComObra) => void;
  info?: Record<string, InfoListaRelatorio>;
  ocultarCriadoEm?: boolean;
}

export default function RelatoriosLista({ relatorios, podeEditar, podeExcluir, onBaixar, onVisualizar, onEditar, onExcluir, liberacoes = {}, mostrarPendenciaEmpresa = false, cliente, onAssinar, info, ocultarCriadoEm = false }: Props) {
  const dataBR = (d: Date) => d.toLocaleDateString('pt-BR');
  const renderNumero = (r: RelatorioComObra) => {
    const n = info?.[r.id]?.numero;
    return n ? formatarNumero(n) : '—';
  };
  const renderEmissao = (r: RelatorioComObra) => {
    const i = info?.[r.id];
    if (!i) return '—';
    if (!i.emissao) return <span className="text-muted-foreground">Pendente</span>;
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {dataBR(i.emissao)}
        {i.rev > 0 && <Badge variant="outline">{revLabel(i.rev)}</Badge>}
      </span>
    );
  };
  const renderAssinCliente = (r: RelatorioComObra) => {
    const i = info?.[r.id];
    if (!i) return '—';
    const ds = i.assinaturasCliente;
    if (ds.length === 0) return r.status === 'assinado' ? <span className="text-muted-foreground">Pendente</span> : '—';
    if (ds.length === 1) return dataBR(ds[0]);
    return (
      <span title={ds.map(dataBR).join('\n')}>
        {dataBR(ds[0])} <span className="text-xs text-muted-foreground">+{ds.length - 1}</span>
      </span>
    );
  };
  const jaAssinei = (r: RelatorioComObra) => !!cliente?.userId && !!liberacoes[r.id]?.assinantesCliente?.includes(cliente.userId);
  const renderStatus = (r: RelatorioComObra) => (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge variant={statusVariant(r.status)}>{(r.status || '').toUpperCase()}</Badge>
      {mostrarPendenciaEmpresa && liberacoes[r.id]?.pendente && <Badge variant="destructive">Aguardando liberação</Badge>}
      {cliente && r.status === 'assinado' && jaAssinei(r) && (
        liberacoes[r.id]?.pendente
          ? <Badge variant="secondary">Aguardando liberação do PDF</Badge>
          : <Badge variant="outline">Assinado por você</Badge>
      )}
    </span>
  );
  const renderActions = (r: RelatorioComObra) => (
    <div className="flex flex-wrap gap-1 items-center">
      {cliente?.userId && r.status === 'assinado' && liberacoes[r.id] && !jaAssinei(r) && onAssinar && (
        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => onAssinar(r)}>
          <PenTool className="h-4 w-4 mr-1" />Assinar
        </Button>
      )}
                      <Button size="sm" variant="ghost" onClick={() => onBaixar(r)} title="Baixar PDF">
                        <Download className="h-4 w-4" />
                      </Button>
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
  );

  return (
    <Card>
      <CardContent className="pt-6">
        {relatorios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum relatório encontrado</p>
        ) : (
          <>
          <div className="hidden md:block">
<Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Período</TableHead>
                {!ocultarCriadoEm && <TableHead>Criado em</TableHead>}
                <TableHead>Emissão</TableHead>
                <TableHead>Assinatura cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorios.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm tabular-nums">{renderNumero(r)}</TableCell>
                  <TableCell className="font-medium">{r.obras?.nome || '—'}</TableCell>
                  <TableCell>{r.obras?.clientes?.nome || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {r.data_inicio ? fmt(r.data_inicio) : '—'} a {r.data_fim ? fmt(r.data_fim) : '—'}
                  </TableCell>
                  {!ocultarCriadoEm && <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>}
                  <TableCell className="text-sm">{renderEmissao(r)}</TableCell>
                  <TableCell className="text-sm">{renderAssinCliente(r)}</TableCell>
                  <TableCell>{renderStatus(r)}</TableCell>
                  <TableCell>
                    {renderActions(r)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
</div>
<div className="md:hidden space-y-3 p-3">
 {relatorios.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum relatório encontrado</p>}
 {relatorios.map((r) => (
 <Card key={r.id}><CardContent className="p-4 space-y-3">
 <h3 className="font-semibold break-words">{info?.[r.id]?.numero ? `${formatarNumero(info[r.id].numero as number)} · ` : ''}{r.obras?.nome || '—'}</h3>
 <div className="space-y-1 text-sm break-words"><p>Cliente: {r.obras?.clientes?.nome || '—'}</p><p>Período: {r.data_inicio ? fmt(r.data_inicio) : '—'} a {r.data_fim ? fmt(r.data_fim) : '—'}</p><p>Emissão: {renderEmissao(r)}</p><p>Assinatura cliente: {renderAssinCliente(r)}</p>{renderStatus(r)}</div>
 {renderActions(r)}
 </CardContent></Card>
 ))}
 </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
