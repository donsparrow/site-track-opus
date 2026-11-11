import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchEmpresaConfigOrBranding } from '@/lib/empresaBranding';
import { gerarPdfRelatorioFinal } from '@/lib/pdfRelatorioFinal';
import LaudosLista from '@/features/relatorio-final/components/LaudosLista';
import StatusLaudoBadge from '@/features/relatorio-final/components/StatusLaudoBadge';
import { statusLaudo } from '@/features/relatorio-final/lib/status';
import { useObrasRelatorioFinal, useRelatorioFinal, useRelatorioFinalFotos } from '@/features/relatorio-final/hooks/useRelatorioFinal';
import { useRelatorioFinalMutations } from '@/features/relatorio-final/hooks/useRelatorioFinalMutations';
import RelatorioFinalEditor from '@/features/relatorio-final/components/RelatorioFinalEditor';
import FotosManager from '@/features/relatorio-final/components/FotosManager';
import GruposFotosManager from '@/features/relatorio-final/components/GruposFotosManager';
import AssinaturasCard from '@/features/relatorio-final/components/AssinaturasCard';
import RelatorioFinalViewer from '@/features/relatorio-final/components/RelatorioFinalViewer';
import type { EmpresaPDFData } from '@/lib/pdfShared';
import type { RelatorioFinalFoto } from '@/features/relatorio-final/types';

export default function RelatorioFinalPage() {
  const { role } = useAuth();
  const isExterno = role === 'sindico' || role === 'cliente';
  const { pode } = usePermissions();
  const [params, setParams] = useSearchParams();
  const obraId = params.get('obra');
  const tipoRelatorio = params.get('tipo') || 'entrega_obra';
  const [gerando, setGerando] = useState(false);

  const { obras, isLoading: loadingObras } = useObrasRelatorioFinal();
  const { data: relatorio, isLoading: loadingRelatorio } = useRelatorioFinal(obraId, tipoRelatorio);
  const { fotos } = useRelatorioFinalFotos(relatorio?.id ?? null);
  const m = useRelatorioFinalMutations(obraId, relatorio?.id ?? null, tipoRelatorio);

  const obra = useMemo(() => obras.find((o) => o.id === obraId) || null, [obras, obraId]);
  const canEdit = pode('relatorio_final', 'editar') && relatorio?.status !== 'assinado';
  const tituloTipo = tipoRelatorio === 'vistoria_previa' ? 'Vistoria Prévia' : 'Entrega de Obra';

  const moverFoto = (id: string, dir: -1 | 1) => {
    const foto = fotos.find((f) => f.id === id);
    if (!foto) return;
    const lista = fotos.filter((f) => f.tipo === foto.tipo).sort((a, b) => a.ordem - b.ordem);
    const i = lista.findIndex((f) => f.id === id);
    const alvo = lista[i + dir];
    if (!alvo) return;
    m.atualizarFoto.mutate({ id: foto.id, ordem: alvo.ordem });
    m.atualizarFoto.mutate({ id: alvo.id, ordem: foto.ordem });
  };

  const gerarPdf = async () => {
    if (!relatorio || !obra) return;
    setGerando(true);
    try {
      const empresa = (await fetchEmpresaConfigOrBranding()) as EmpresaPDFData | null;
      await gerarPdfRelatorioFinal({ relatorio, fotos, obraNome: obra.nome, empresa });
    } catch (e) {
      toast.error(`Erro ao gerar PDF: ${e instanceof Error ? e.message : 'desconhecido'}`);
    } finally {
      setGerando(false);
    }
  };

  if (!obraId) return <LaudosLista externo={isExterno} onAbrir={(obra, tipo) => setParams({ obra, tipo })} />;

  return (
    <div className="space-y-6">
      {!isExterno && <header className="space-y-3">
        <Button variant="link" className="h-auto p-0" onClick={() => setParams({})}><ChevronLeft />Laudos Técnicos / {obra?.nome}</Button>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-bold break-words">{obra?.nome || 'Laudo'}</h1>{relatorio && <StatusLaudoBadge status={statusLaudo(relatorio)} />}</div><p className="label-tech">{tituloTipo}</p></div>{relatorio && <Button variant="outline" disabled={gerando} onClick={gerarPdf}><FileDown />{gerando ? 'Gerando...' : 'PDF'}</Button>}</div>
      </header>}
      {loadingObras || loadingRelatorio ? (
        <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : !obra ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma obra disponível.</CardContent></Card>
      ) : !relatorio ? (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground">Esta obra ainda não possui laudo de {tituloTipo}.</p>
          </CardContent>
        </Card>
      ) : isExterno ? (
        <RelatorioFinalViewer
          relatorio={relatorio}
          fotos={fotos}
          obraNome={obra.nome}
          tipoRelatorio={tipoRelatorio}
          onAssinar={(tipo, values) => m.assinar.mutate({ tipo, ...values })}
          assinarPending={m.assinar.isPending}
          onVoltar={() => setParams({})}
          onPdf={gerarPdf}
          gerandoPdf={gerando}
        />
      ) : (
        <div className="space-y-6">
          {relatorio.status === 'assinado' && (
            <p className="text-sm text-muted-foreground" role="status">
              Laudo assinado pelas duas partes. Conteúdo e assinaturas bloqueados para edição.
            </p>
          )}
          <RelatorioFinalEditor
            relatorio={relatorio}
            tipoRelatorio={tipoRelatorio}
            editable={canEdit}
            saving={m.salvar.isPending}
            uploadingCapa={m.uploadCapa.isPending}
            uploadingTemplate={m.uploadTemplateCapa.isPending}
            onSalvar={(values) => m.salvar.mutate(values)}
            onUploadCapa={(file) => m.uploadCapa.mutate(file)}
            onUploadTemplate={(file) => m.uploadTemplateCapa.mutate(file)}
            onRemoverTemplate={() => m.removerTemplateCapa.mutate(relatorio.template_capa_url)}
          />

          {tipoRelatorio === 'vistoria_previa' ? (
            <GruposFotosManager
              fotos={fotos}
              editable={canEdit}
              uploading={m.adicionarFotos.isPending}
              onUpload={(files, grupo) => m.adicionarFotos.mutate({
                files,
                tipo: grupo,
                ordemInicial: fotos.filter((f) => f.tipo === grupo).length,
              })}
              onLegenda={(id, legenda) => m.atualizarFoto.mutate({ id, legenda })}
              onMover={moverFoto}
              onExcluir={(foto: RelatorioFinalFoto) => m.excluirFoto.mutate({ id: foto.id, fotoUrl: foto.foto_url })}
              onRenomearGrupo={(antigoNome, novoNome) => m.renomearGrupoFotos.mutate({ antigoNome, novoNome })}
            />
          ) : (
            (['pre_obra', 'pos_obra'] as string[]).map((tipo) => (
              <FotosManager
                key={tipo}
                tipo={tipo}
                titulo={tipo === 'pre_obra' ? 'Registro fotográfico — Pré-obra' : 'Registro fotográfico — Pós-obra'}
                fotos={fotos}
                editable={canEdit}
                uploading={m.adicionarFotos.isPending}
                onUpload={(files) => m.adicionarFotos.mutate({
                  files,
                  tipo,
                  ordemInicial: fotos.filter((f) => f.tipo === tipo).length,
                })}
                onLegenda={(id, legenda) => m.atualizarFoto.mutate({ id, legenda })}
                onMover={moverFoto}
                onExcluir={(foto: RelatorioFinalFoto) => m.excluirFoto.mutate({ id: foto.id, fotoUrl: foto.foto_url })}
              />
            ))
          )}

          <AssinaturasCard
            relatorio={relatorio}
            editable={pode('relatorio_final', 'editar') && relatorio.status !== 'assinado'}
            saving={m.assinar.isPending}
            onAssinar={(tipo, values) => m.assinar.mutate({ tipo, ...values })}
            onRemover={(tipo) => m.removerAssinatura.mutate(tipo)}
          />
        </div>
      )}
    </div>
  );
}
