import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, FileText, Trash2 } from 'lucide-react';
import type { Assinatura, EmpresaConfig } from '../types';
import {
  baixarPdfArquivado, listarPdfsArquivados, nomeArquivoPdf, type PdfArquivado,
} from '../pdfArquivado';
import { useRelatorioMutations } from '../hooks/useRelatorioMutations';

interface Props {
  assinaturas: Assinatura[];
  assinaturaUrls: Record<string, string>;
  relatorioId?: string | null;
  relatorioStatus?: string | null;
  isAdmin?: boolean;
  empresa?: EmpresaConfig | null;
  nomeObra?: string;
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function DocumentoArquivado({ relatorioId, isAdmin, nomeObra }: { relatorioId: string; isAdmin: boolean; nomeObra: string }) {
  const qc = useQueryClient();
  const m = useRelatorioMutations();
  const [excluindo, setExcluindo] = useState<PdfArquivado | null>(null);

  const { data: registros = [], isPending } = useQuery({
    queryKey: ['relatorio-pdfs-arquivados', relatorioId],
    queryFn: () => listarPdfsArquivados(relatorioId),
  });

  const vigente = registros.find((r) => !r.excluido_em) || null;

  const handleBaixar = async (registro: PdfArquivado) => {
    await baixarPdfArquivado(registro, nomeArquivoPdf(nomeObra));
  };

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <h3 className="text-sm font-display font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4" />Documento arquivado
        </h3>
        {isPending ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum PDF arquivado ainda. Será arquivado no próximo download.</p>
        ) : (
          <div className="space-y-3">
            {registros.map((r) => {
              const excluido = !!r.excluido_em;
              const isVigente = vigente?.id === r.id;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 p-3 border rounded-lg ${excluido ? 'opacity-60' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{formatDataHora(r.gerado_em)}</span>
                      {isVigente && <Badge variant="default">Vigente</Badge>}
                      <Badge variant="secondary">
                        {r.origem === 'assinatura' ? 'Na assinatura' : 'Arquivamento posterior'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.qtd_assinaturas} assinatura{r.qtd_assinaturas === 1 ? '' : 's'} · SHA-256 {r.sha256.slice(0, 12)}
                    </p>
                    {excluido && r.excluido_em && (
                      <p className="text-xs text-muted-foreground mt-1">Excluído em {formatDataHora(r.excluido_em)}</p>
                    )}
                  </div>
                  {!excluido && (
                    <div className="flex items-center gap-1 shrink-0">
                      {isVigente && (
                        <Button variant="outline" size="sm" onClick={() => handleBaixar(r)}>
                          <Download className="h-4 w-4 mr-1" />Baixar original
                        </Button>
                      )}
                      {isAdmin && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setExcluindo(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir PDF arquivado</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!excluindo} onOpenChange={(open) => !open && setExcluindo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir PDF arquivado?</AlertDialogTitle>
              <AlertDialogDescription>
                O arquivo deste relatório assinado será apagado permanentemente.
                A data e a impressão digital (SHA-256) ficam registradas no histórico.
                No próximo download, um novo PDF será gerado a partir dos dados atuais
                e arquivado automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!excluindo) return;
                  m.excluirPdfArquivado.mutate(
                    { registro: excluindo, relatorioId },
                    { onSuccess: () => {
                      setExcluindo(null);
                      qc.invalidateQueries({ queryKey: ['relatorio-pdfs-arquivados', relatorioId] });
                    } },
                  );
                }}
              >
                Excluir definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function AssinaturasTab({
  assinaturas, assinaturaUrls, relatorioId, relatorioStatus, isAdmin = false, nomeObra = 'relatorio',
}: Props) {
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          {assinaturas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma assinatura registrada</p>
          ) : (
            <div className="space-y-4">
              {assinaturas.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  {assinaturaUrls[a.id] ? (
                    <img src={assinaturaUrls[a.id]} alt={`Assinatura de ${a.nome_assinante}`} className="h-16 w-24 object-contain border rounded bg-background" />
                  ) : (
                    <div className="h-16 w-24 flex items-center justify-center border rounded text-[10px] text-muted-foreground text-center px-1">
                      Carregando assinatura...
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{a.nome_assinante}</p>
                    {a.cargo && <p className="text-sm text-muted-foreground">{a.cargo}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={a.tipo === 'responsavel_tecnico' ? 'default' : 'secondary'}>
                        {a.tipo === 'responsavel_tecnico' ? 'Resp. Técnico' : 'Cliente'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.data_assinatura + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {relatorioStatus === 'assinado' && relatorioId && (
        <DocumentoArquivado relatorioId={relatorioId} isAdmin={isAdmin} nomeObra={nomeObra} />
      )}
    </>
  );
}
