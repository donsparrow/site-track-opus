import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Download, History, List, PenTool, Save } from 'lucide-react';

import { useRelatorioDados, useRelatorioDetail } from '../hooks/useRelatorioDetail';
import { useRelatorioHistorico } from '../hooks/useRelatorioHistorico';
import { useRelatorioMutations } from '../hooks/useRelatorioMutations';
import { usePeriodoSugerido } from '../hooks/usePeriodoSugerido';
import type { EmpresaConfig, ObraRelatorio, RelatorioComObra } from '../types';
import { revLabel } from '../utils';
import { aplicarIndicadoresCongelados } from '../indicadores';

import IndicadoresPrazo from './IndicadoresPrazo';
import ResumoTab from './ResumoTab';
import EvolucaoTab from './EvolucaoTab';
import AssinaturasTab from './AssinaturasTab';
import HistoricoVersoes from './HistoricoVersoes';
import AssinarDialog from './AssinarDialog';
import RelatorioSkeleton from './RelatorioSkeleton';
import ErroCarregamento from './ErroCarregamento';

interface Props {
  obras: ObraRelatorio[];
  empresa: EmpresaConfig | null;
  relatorioInicial: RelatorioComObra | null;
  readOnly: boolean;
  podeEditar: boolean;
  onVoltar: () => void;
}

export default function RelatorioEditor({ obras, empresa, relatorioInicial, readOnly, podeEditar, onVoltar }: Props) {
  const [relatorioId, setRelatorioId] = useState<string | null>(relatorioInicial?.id ?? null);
  const [obraId, setObraId] = useState(relatorioInicial?.obra_id ?? '');
  const [inicio, setInicio] = useState(relatorioInicial?.data_inicio ?? '');
  const [fim, setFim] = useState(relatorioInicial?.data_fim ?? '');
  const [revisaoPdf, setRevisaoPdf] = useState(relatorioInicial?.revisao_pdf ?? 0);
  const [consolidado, setConsolidado] = useState(!!relatorioInicial);
  const [signOpen, setSignOpen] = useState(false);
  const [tab, setTab] = useState('resumo');

  const obraData = obras.find((o) => o.id === obraId) || null;
  const isNovo = !relatorioInicial;

  const periodoSugerido = usePeriodoSugerido(obraId, isNovo && !relatorioId);
  useEffect(() => {
    if (!isNovo || relatorioId || !periodoSugerido.isSuccess) return;
    if (periodoSugerido.data) {
      setInicio(periodoSugerido.data.inicio);
      setFim(periodoSugerido.data.fim);
    } else {
      setInicio(''); setFim('');
      toast.info('Não há novos diários para gerar relatório nesta obra.');
    }
  }, [isNovo, relatorioId, periodoSugerido.isSuccess, periodoSugerido.data]);

  const dadosQuery = useRelatorioDados({ obraId, inicio, fim, relatorioId });
  const { dados } = dadosQuery;
  const detail = useRelatorioDetail(relatorioId);
  const historico = useRelatorioHistorico(relatorioId, tab === 'versoes');
  /** Exibição e PDF usam os indicadores congelados no fechamento (documento imutável). */
  const dadosExibicao = useMemo(
    () => aplicarIndicadoresCongelados(dados, detail.relatorio),
    [dados, detail.relatorio],
  );
  const m = useRelatorioMutations();

  const carregando = dadosQuery.isPending && !!obraId && !!inicio && !!fim;

  const handleConsolidar = () => {
    if (!obraId || !inicio || !fim) return;
    m.consolidar.mutate({ obraId, inicio, fim, dados }, {
      onSuccess: (res) => { setRelatorioId(res.relatorioId); setRevisaoPdf(res.revisaoPdf); setConsolidado(true); },
    });
  };

  const handleSalvar = () => {
    if (!relatorioId) { toast.error('Consolide os dados primeiro'); return; }
    m.salvar.mutate({ relatorioId, periodo: { inicio, fim }, dados });
  };

  const handleGerarPdf = () => {
    if (!obraData) { toast.error('Selecione uma obra e consolide os dados'); return; }
    if (!empresa) toast.info('Dados da empresa não configurados. O PDF será gerado sem cabeçalho/logo.');
    m.gerarPdf.mutate(
      { relatorioId, empresa, obra: obraData, periodo: { inicio, fim }, dados: dadosExibicao, revisaoPdf },
      { onSuccess: (res) => setRevisaoPdf(res.novaRevisao) },
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Button variant="outline" onClick={onVoltar}><List className="h-4 w-4 mr-2" />Voltar à Lista</Button>
        <h1 className="text-3xl font-display font-bold">
          {readOnly ? 'Visualizar Relatório' : (relatorioId ? 'Editar Relatório' : 'Novo Relatório')}
        </h1>
        {readOnly && <Badge variant="secondary" className="text-sm">Somente leitura</Badge>}
        {relatorioId && revisaoPdf > 0 && <Badge variant="default" className="text-sm">{revLabel(revisaoPdf - 1)}</Badge>}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Obra</Label>
              <Select value={obraId} onValueChange={setObraId} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} disabled={readOnly} />
            </div>
            {!readOnly && podeEditar && (
              <Button onClick={handleConsolidar} disabled={!obraId || !inicio || !fim || m.consolidar.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <BarChart3 className="h-4 w-4 mr-2" />{m.consolidar.isPending ? 'Consolidando...' : 'Consolidar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {dadosQuery.isError && <ErroCarregamento message="Não foi possível carregar os dados do relatório." onRetry={() => dadosQuery.refetch()} />}

      {consolidado && relatorioId && !dadosQuery.isError && (
        <>
          {obraData?.clientes && (
            <Card className="mb-6">
              <CardHeader className="py-3"><CardTitle className="text-sm font-display">Dados do Cliente</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{obraData.clientes.nome || '—'}</span></div>
                  <div><span className="text-muted-foreground">CNPJ/CPF:</span> <span className="font-medium">{obraData.clientes.cpf_cnpj || '—'}</span></div>
                  <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{obraData.clientes.email || '—'}</span></div>
                  <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{obraData.clientes.telefone || '—'}</span></div>
                </div>
              </CardContent>
            </Card>
          )}

          {carregando ? <RelatorioSkeleton rows={6} /> : <IndicadoresPrazo prazos={dadosExibicao.prazos} />}

          <div className="flex gap-3 mb-6 flex-wrap">
            {podeEditar && !readOnly && (
              <Button onClick={handleSalvar} disabled={m.salvar.isPending} variant="outline">
                <Save className="h-4 w-4 mr-2" />{m.salvar.isPending ? 'Salvando...' : 'Salvar Relatório'}
              </Button>
            )}
            <Button onClick={handleGerarPdf} disabled={m.gerarPdf.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Download className="h-4 w-4 mr-2" />{m.gerarPdf.isPending ? 'Gerando...' : 'Gerar PDF'}
            </Button>
            {podeEditar && !readOnly && (
              <Button variant="outline" onClick={() => setSignOpen(true)}><PenTool className="h-4 w-4 mr-2" />Assinar</Button>
            )}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="evolucao">Evolução Diária</TabsTrigger>
              <TabsTrigger value="assinaturas">Assinaturas ({detail.assinaturas.length})</TabsTrigger>
              <TabsTrigger value="versoes"><History className="h-3 w-3 mr-1" />Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo">
              {carregando ? <RelatorioSkeleton rows={6} /> : <ResumoTab dados={dadosExibicao} />}
            </TabsContent>
            <TabsContent value="evolucao">
              {carregando ? <RelatorioSkeleton rows={6} /> : <EvolucaoTab dados={dados} />}
            </TabsContent>
            <TabsContent value="assinaturas">
              <AssinaturasTab assinaturas={detail.assinaturas} assinaturaUrls={detail.assinaturaUrls} />
            </TabsContent>
            <TabsContent value="versoes">
              <HistoricoVersoes versoes={historico.versoes} nomesUsuarios={historico.nomesUsuarios} loading={historico.isPending} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <AssinarDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        saving={m.assinar.isPending}
        onConfirm={(values) => {
          if (!relatorioId) return;
          m.assinar.mutate({ relatorioId, ...values }, { onSuccess: () => setSignOpen(false) });
        }}
      />
    </div>
  );
}
