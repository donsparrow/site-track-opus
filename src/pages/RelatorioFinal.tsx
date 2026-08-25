import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, FilePlus2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchEmpresaConfigOrBranding } from '@/lib/empresaBranding';
import { gerarPdfRelatorioFinal } from '@/lib/pdfRelatorioFinal';
import { relatorioFinalKeys } from '@/features/relatorio-final/queryKeys';
import { useObrasRelatorioFinal, useRelatorioFinal, useRelatorioFinalFotos } from '@/features/relatorio-final/hooks/useRelatorioFinal';
import { useRelatorioFinalMutations } from '@/features/relatorio-final/hooks/useRelatorioFinalMutations';
import RelatorioFinalEditor from '@/features/relatorio-final/components/RelatorioFinalEditor';
import FotosManager from '@/features/relatorio-final/components/FotosManager';
import AssinaturasCard from '@/features/relatorio-final/components/AssinaturasCard';
import type { EmpresaPDFData } from '@/lib/pdfShared';
import type { RelatorioFinalFoto, TipoFoto } from '@/features/relatorio-final/types';

export default function RelatorioFinalPage() {
  const { empresaId } = useAuth();
  const { pode } = usePermissions();
  const qc = useQueryClient();
  const [obraId, setObraId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [gerando, setGerando] = useState(false);

  const { obras, isLoading: loadingObras } = useObrasRelatorioFinal();
  const { data: relatorio, isLoading: loadingRelatorio } = useRelatorioFinal(obraId);
  const { fotos } = useRelatorioFinalFotos(relatorio?.id ?? null);
  const m = useRelatorioFinalMutations(obraId, relatorio?.id ?? null);

  useEffect(() => {
    if (!obraId && obras.length) setObraId(obras[0].id);
  }, [obras, obraId]);

  const obra = useMemo(() => obras.find((o) => o.id === obraId) || null, [obras, obraId]);
  const canEdit = pode('relatorio_final', 'editar') && relatorio?.status !== 'assinado';
  const canCreate = pode('relatorio_final', 'criar');

  const criarRelatorio = async () => {
    if (!obra) return;
    setCriando(true);
    const { error } = await supabase.from('relatorios_finais').insert({
      obra_id: obra.id,
      empresa_id: empresaId,
      cliente_nome: obra.clientes?.nome ?? null,
      cliente_cpf_cnpj: obra.clientes?.cpf_cnpj ?? null,
      endereco: obra.endereco,
      responsavel: obra.responsavel_tecnico,
      data_inicio: obra.data_inicio,
      data_fim_prevista: obra.data_fim_prevista,
    });
    setCriando(false);
    if (error) { toast.error(`Erro ao criar relatório: ${error.message}`); return; }
    toast.success('Relatório final criado');
    qc.invalidateQueries({ queryKey: relatorioFinalKeys.relatorio(obra.id) });
  };

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
      const empresa = await fetchEmpresaConfigOrBranding<EmpresaPDFData>();
      await gerarPdfRelatorioFinal({ relatorio, fotos, obraNome: obra.nome, empresa });
    } catch (e) {
      toast.error(`Erro ao gerar PDF: ${e instanceof Error ? e.message : 'desconhecido'}`);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Relatório Final</h1>
          <p className="text-sm text-muted-foreground">Relatório de entrega da obra com registro fotográfico e assinaturas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={obraId ?? ''} onValueChange={setObraId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
            <SelectContent>
              {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {relatorio && (
            <Button variant="outline" disabled={gerando} onClick={gerarPdf}>
              <FileDown className="h-4 w-4 mr-1" /> {gerando ? 'Gerando...' : 'PDF'}
            </Button>
          )}
        </div>
      </div>

      {loadingObras || loadingRelatorio ? (
        <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : !obra ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma obra disponível.</CardContent></Card>
      ) : !relatorio ? (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground">Esta obra ainda não possui relatório final.</p>
            {canCreate && (
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={criando} onClick={criarRelatorio}>
                <FilePlus2 className="h-4 w-4 mr-1" /> {criando ? 'Criando...' : 'Gerar Relatório Final'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <RelatorioFinalEditor
            relatorio={relatorio}
            editable={canEdit}
            saving={m.salvar.isPending}
            uploadingCapa={m.uploadCapa.isPending}
            onSalvar={(values) => m.salvar.mutate(values)}
            onUploadCapa={(file) => m.uploadCapa.mutate(file)}
          />

          {(['pre_obra', 'pos_obra'] as TipoFoto[]).map((tipo) => (
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
          ))}

          <AssinaturasCard
            relatorio={relatorio}
            editable={pode('relatorio_final', 'editar')}
            saving={m.assinar.isPending}
            onAssinar={(tipo, values) => m.assinar.mutate({ tipo, ...values })}
            onRemover={(tipo) => m.removerAssinatura.mutate(tipo)}
          />
        </div>
      )}
    </div>
  );
}
