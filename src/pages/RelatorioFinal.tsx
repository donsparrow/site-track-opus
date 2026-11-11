import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, ChevronLeft, Eye, Clock, Cloud, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchEmpresaConfigOrBranding } from '@/lib/empresaBranding';
import LaudosLista from '@/features/relatorio-final/components/LaudosLista';
import StatusLaudoBadge from '@/features/relatorio-final/components/StatusLaudoBadge';
import { statusLaudo } from '@/features/relatorio-final/lib/status';
import { useObrasRelatorioFinal, useRelatorioFinal, useRelatorioFinalFotos } from '@/features/relatorio-final/hooks/useRelatorioFinal';
import { useRelatorioFinalMutations } from '@/features/relatorio-final/hooks/useRelatorioFinalMutations';
import LaudoEditorEtapas from '@/features/relatorio-final/components/LaudoEditorEtapas';
import { useLaudoAutosave } from '@/features/relatorio-final/hooks/useLaudoAutosave';
import RelatorioFinalViewer from '@/features/relatorio-final/components/RelatorioFinalViewer';
import type { EmpresaPDFData } from '@/lib/pdfShared';

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
  const auto = useLaudoAutosave(relatorio, !isExterno && canEdit, m.salvarAuto.mutateAsync);
  const preview = !isExterno && params.get('preview') === '1';
  const voltar = async () => { try { await auto.flush(); setParams({}); } catch { /* Retry remains available. */ } };
  const verCliente = async () => { try { await auto.flush(); const p = new URLSearchParams(params); p.set('preview', '1'); setParams(p); } catch { /* Retry remains available. */ } };
  const voltarEditor = () => { const p = new URLSearchParams(params); p.delete('preview'); setParams(p); };
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
      const salvo = isExterno ? relatorio : await auto.flush();
      if (!salvo) return;
      const { gerarPdfRelatorioFinal } = await import('@/lib/pdfRelatorioFinal');
      const empresa = (await fetchEmpresaConfigOrBranding()) as EmpresaPDFData | null;
      const { falhasFotos } = await gerarPdfRelatorioFinal({ relatorio: salvo, fotos, obraNome: obra.nome, empresa });
      if (falhasFotos) toast.warning(`${falhasFotos} foto(s) não puderam ser processadas e foram inseridas sem ajuste.`);
    } catch (e) {
      toast.error(`Erro ao gerar PDF: ${e instanceof Error ? e.message : 'desconhecido'}`);
    } finally {
      setGerando(false);
    }
  };

  if (!obraId) return <LaudosLista externo={isExterno} onAbrir={(obra, tipo) => setParams({ obra, tipo })} />;

  return (
    <div className="space-y-6">
      {!isExterno && !preview && <header className="space-y-3">
        <Button variant="link" className="h-auto p-0" onClick={() => void voltar()}><ChevronLeft />Laudos Técnicos / {obra?.nome}</Button>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-bold break-words">{obra?.nome || 'Laudo'}</h1>{relatorio && <StatusLaudoBadge status={statusLaudo(relatorio)} />}</div><div className="flex flex-wrap items-center gap-3"><p className="label-tech">{tituloTipo}</p>{auto.estado === 'saving' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-4 w-4" />Salvando…</span>}{auto.estado === 'saved' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="relative"><Cloud className="h-4 w-4" /><Check className="absolute bottom-0 right-0 h-2 w-2" /></span>Salvo automaticamente às {auto.hora}</span>}{auto.estado === 'error' && <span className="flex flex-wrap items-center gap-2 text-xs text-destructive">Não foi possível salvar<Button variant="ghost" className="text-destructive" onClick={() => void auto.flush().catch(() => {})}>Tentar de novo</Button></span>}</div></div>{relatorio && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void verCliente()}><Eye />Ver como cliente</Button><Button variant="outline" disabled={gerando} onClick={gerarPdf}><FileDown />{gerando ? 'Gerando...' : 'PDF'}</Button></div>}</div>
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
      ) : isExterno || preview ? (
        <RelatorioFinalViewer
          relatorio={preview ? auto.form || relatorio : relatorio}
          preview={preview}
          fotos={fotos}
          obraNome={obra.nome}
          tipoRelatorio={tipoRelatorio}
          onAssinar={(tipo, values) => m.assinar.mutate({ tipo, ...values })}
          assinarPending={m.assinar.isPending}
          onVoltar={preview ? voltarEditor : () => setParams({})}
          onPdf={gerarPdf}
          gerandoPdf={gerando}
        />
      ) : (
        <LaudoEditorEtapas key={relatorio.id} form={auto.form || relatorio} fotos={fotos} obraNome={obra.nome} editable={canEdit} alterar={auto.alterar} flush={auto.flush} mutations={m} moverFoto={moverFoto} />
      )}
    </div>
  );
}
