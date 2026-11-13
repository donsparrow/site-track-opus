import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchEmpresaConfigOrBranding } from '@/lib/empresaBranding';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { usePermissions } from '@/hooks/usePermissions';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ClipboardList, FileText, Clock, Timer, Download, Trash2, FolderOpen, FileImage, File } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import AnotacoesObra from '@/components/AnotacoesObra';
import TimelineObra from '@/components/TimelineObra';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { gerarDashboardPDF } from '@/lib/pdfDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClienteCard from '@/features/obra-detalhe/ClienteCard';
import { AndamentoPrazoCard, CronogramaAba, DiarioAba, RelatoriosAba, LaudosAba, EquipeAba } from '@/features/obra-detalhe/Abas';

interface Parcela {
  id: string;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  forma_pagamento: string | null;
}

interface Despesa {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data: string;
  forma_pagamento: string | null;
}

interface DocStats {
  totalPastas: number;
  totalArquivos: number;
  pdfs: number;
  imagens: number;
  recentFiles: { nome: string; tipo: string; created_at: string }[];
}

interface ObraDetalheData {
  obra: any;
  parcelas: Parcela[];
  despesas: Despesa[];
  financeiro: { contrato: number; recebido: number; aReceber: number; gasto: number; saldo: number };
  saldoPrazo: number | null;
  docStats: DocStats;
}

const EMPTY_DOC_STATS: DocStats = { totalPastas: 0, totalArquivos: 0, pdfs: 0, imagens: 0, recentFiles: [] };
const EMPTY_FINANCEIRO = { contrato: 0, recebido: 0, aReceber: 0, gasto: 0, saldo: 0 };

export default function ObraDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, canEdit, role, isSuperAdmin, isAdmin } = useAuth();
  const { pode, loading: permissionsLoading } = usePermissions();
  const queryClient = useQueryClient();
  const { isObraAllowed, loading: obrasFilterLoading } = useObrasFiltered();
  const [exportingPdf, setExportingPdf] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabsListRef = useRef<HTMLDivElement>(null);
  const tabAtual = searchParams.get('tab');

  // Delete obra
  const [deleteObraOpen, setDeleteObraOpen] = useState(false);
  const [deleteObraBlocked, setDeleteObraBlocked] = useState(false);
  const [deleteObraMsg, setDeleteObraMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.obraDetalhe(id ?? '', user?.id ?? ''),
    enabled: !!id && !!user && !obrasFilterLoading && !permissionsLoading,
    staleTime: 0,
    queryFn: async (): Promise<ObraDetalheData> => {
      // Tudo que não depende de outro resultado roda em paralelo
      const [obraRes, relRes, recRes, despRes, pastasRes] = await Promise.all([
        supabase.from('obras').select('*, clientes(nome, cpf_cnpj, telefone, email, endereco, administradora)').eq('id', id!).single(),
        supabase.from('relatorios').select('saldo_prazo').eq('obra_id', id!).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('receitas').select('id, valor_total').eq('obra_id', id!),
        supabase.from('despesas').select('*').eq('obra_id', id!).order('data', { ascending: false }),
        supabase.from('documentos_pastas').select('id').eq('obra_id', id!),
      ]);

      const obraData = obraRes.data;

      // Verificação de acesso antes de qualquer exibição de dados
      if (obraData && !isObraAllowed(obraData.id)) {
        return { obra: null, parcelas: [], despesas: [], financeiro: EMPTY_FINANCEIRO, saldoPrazo: null, docStats: EMPTY_DOC_STATS };
      }

      const receitas = recRes.data || [];
      const totalContrato = receitas.reduce((s, r) => s + Number(r.valor_total), 0);
      const receitaIds = receitas.map(r => r.id);
      const pastaIds = (pastasRes.data || []).map(p => p.id);

      // Parcelas (depende de receitas) e arquivos (depende de pastas), em paralelo entre si
      const [parcelasRes, arquivosRes] = await Promise.all([
        receitaIds.length > 0
          ? supabase.from('parcelas').select('*').in('receita_id', receitaIds).order('data_vencimento')
          : Promise.resolve({ data: [] as any[] }),
        pastaIds.length > 0
          ? supabase.from('documentos_arquivos').select('nome_arquivo, tipo, created_at').in('pasta_id', pastaIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const allParcelas = ((parcelasRes.data || []) as Parcela[]).map(p => ({
        ...p,
        status: p.data_recebimento ? 'recebido' : (p.data_vencimento < today ? 'atrasado' : 'pendente')
      }));

      const totalRecebido = allParcelas.filter(p => p.status === 'recebido').reduce((s, p) => s + Number(p.valor), 0);
      const totalAReceber = allParcelas.filter(p => p.status !== 'recebido').reduce((s, p) => s + Number(p.valor), 0);

      const despesasData = (despRes.data || []) as Despesa[];
      const totalGasto = despesasData.reduce((s, d) => s + Number(d.valor), 0);

      const files = arquivosRes.data || [];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
      const pdfs = files.filter((f: any) => f.tipo === 'pdf' || f.nome_arquivo.toLowerCase().endsWith('.pdf')).length;
      const imgs = files.filter((f: any) => imageExts.some(ext => f.nome_arquivo.toLowerCase().endsWith(`.${ext}`))).length;

      return {
        obra: obraData,
        parcelas: allParcelas,
        despesas: despesasData,
        financeiro: {
          contrato: totalContrato,
          recebido: totalRecebido,
          aReceber: totalAReceber,
          gasto: totalGasto,
          saldo: totalRecebido - totalGasto,
        },
        saldoPrazo: relRes.data?.saldo_prazo ?? null,
        docStats: {
          totalPastas: pastaIds.length,
          totalArquivos: files.length,
          pdfs,
          imagens: imgs,
          recentFiles: files.slice(0, 5).map((f: any) => ({ nome: f.nome_arquivo, tipo: f.tipo, created_at: f.created_at })),
        },
      };
    },
  });

  const obra = data?.obra ?? null;
  const parcelas = data?.parcelas ?? [];
  const despesas = data?.despesas ?? [];
  const financeiro = data?.financeiro ?? EMPTY_FINANCEIRO;
  const saldoPrazo = data?.saldoPrazo ?? null;
  const docStats = data?.docStats ?? EMPTY_DOC_STATS;
  const loading = obrasFilterLoading || permissionsLoading || isLoading;
  // Mantém a aba ativa visível na barra com rolagem horizontal (celular)
  useEffect(() => {
    const el = tabsListRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tabAtual, loading]);

  // Mesmo nome da função anterior: invalida o detalhe da obra e o dashboard
  const fetchData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.obraDetalhe(id ?? '', user?.id ?? '') });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient, id, user?.id]);

  // --- DELETE OBRA ---
  const handleCheckDeleteObra = async () => {
    if (!id) return;
    const checks = await Promise.all([
      supabase.from('receitas').select('id', { count: 'exact', head: true }).eq('obra_id', id),
      supabase.from('despesas').select('id', { count: 'exact', head: true }).eq('obra_id', id),
      supabase.from('diario_obra').select('id', { count: 'exact', head: true }).eq('obra_id', id),
      supabase.from('relatorios').select('id', { count: 'exact', head: true }).eq('obra_id', id),
      supabase.from('documentos_pastas').select('id', { count: 'exact', head: true }).eq('obra_id', id),
    ]);
    const hasData = checks.some(c => (c.count ?? 0) > 0);
    if (hasData) {
      setDeleteObraBlocked(true);
      setDeleteObraMsg('Não é possível excluir esta obra pois existem dados vinculados (financeiro, diário, relatórios ou documentos).');
    } else {
      setDeleteObraBlocked(false);
      setDeleteObraMsg('Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita.');
    }
    setDeleteObraOpen(true);
  };

  const handleDeleteObra = async () => {
    if (!id) return;
    const { error } = await supabase.from('obras').delete().eq('id', id);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Obra excluída com sucesso!');
      void queryClient.invalidateQueries({ queryKey: ['obrasLista'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      window.location.href = '/dashboard';
    }
    setDeleteObraOpen(false);
  };

  const handleExportPDF = useCallback(async () => {
    if (!obra) return;
    setExportingPdf(true);
    try {
      const empresaData = await fetchEmpresaConfigOrBranding<Record<string, unknown>>();

      let chartImage: string | null = null;
      if (chartRef.current) {
        const svgElement = chartRef.current.querySelector('svg');
        if (svgElement) {
          try {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            await new Promise<void>((resolve) => {
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth * 2;
                canvas.height = img.naturalHeight * 2;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                chartImage = canvas.toDataURL('image/png');
                URL.revokeObjectURL(url);
                resolve();
              };
              img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
              img.src = url;
            });
          } catch { /* skip */ }
        }
      }

      await gerarDashboardPDF({
        empresa: empresaData,
        obra: {
          nome: obra.nome, endereco: obra.endereco, responsavel: obra.responsavel_tecnico,
          status: obra.status, data_inicio: obra.data_inicio, data_fim_prevista: obra.data_fim_prevista,
          cliente_nome: obra.clientes?.nome,
          anotacoes: (role === 'admin' || role === 'trabalhador') ? obra.anotacoes : undefined,
        },
        financeiro,
        parcelas: parcelas.map(p => ({ numero_parcela: p.numero_parcela, valor: p.valor, data_vencimento: p.data_vencimento, status: p.status, forma_pagamento: p.forma_pagamento })),
        prazos: { contratual: obra.prazo_contratual_dias, saldoPrazo },
        chartImage,
      });
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar PDF');
    } finally { setExportingPdf(false); }
  }, [obra, financeiro, parcelas, saldoPrazo, role]);

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const statusBadge = (status: string) => {
    if (status === 'recebido') return <Badge className="bg-success text-success-foreground">Recebido</Badge>;
    if (status === 'atrasado') return <Badge variant="destructive">Atrasado</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const tipoLabels: Record<string, string> = {
    material: 'Material', mao_obra: 'Mão de Obra', ferramenta: 'Ferramenta',
    manutencao: 'Manutenção', outros: 'Outros',
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  if (!obra) return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-muted-foreground">Obra não encontrada ou acesso não autorizado.</p>
      <Link to="/dashboard" className="text-sm text-primary hover:underline">Voltar ao Dashboard</Link>
    </div>
  );

  const statusLabels: Record<string, string> = { planejamento: 'Planejamento', andamento: 'Em andamento', concluida: 'Concluída' };
  const atrasadas = parcelas.filter(p => p.status === 'atrasado').length;
  

  const chartData = [
    { name: 'Recebido', value: financeiro.recebido, color: 'hsl(142, 70%, 40%)' },
    { name: 'A Receber', value: financeiro.aReceber, color: 'hsl(38, 92%, 50%)' },
    { name: 'Gastos', value: financeiro.gasto, color: 'hsl(0, 72%, 51%)' },
    { name: 'Saldo', value: Math.abs(financeiro.saldo), color: financeiro.saldo >= 0 ? 'hsl(142, 70%, 40%)' : 'hsl(0, 72%, 51%)' },
  ];

  const abas = [
    { id: 'geral', label: 'Visão Geral', ok: true },
    { id: 'cronograma', label: 'Cronograma', ok: pode('cronograma', 'visualizar') },
    { id: 'diario', label: 'Diário', ok: pode('diario_obra', 'visualizar') },
    { id: 'relatorios', label: 'Relatórios', ok: pode('relatorios', 'visualizar') },
    { id: 'laudos', label: 'Laudos', ok: pode('relatorio_final', 'visualizar') },
    { id: 'financeiro', label: 'Financeiro', ok: pode('financeiro', 'visualizar') },
    { id: 'documentos', label: 'Documentos', ok: pode('documentos', 'visualizar') },
    { id: 'equipe', label: 'Equipe', ok: pode('funcionarios', 'visualizar') || pode('ferramentas', 'visualizar') },
    { id: 'anotacoes', label: 'Anotações', ok: role === 'admin' || role === 'trabalhador' },
  ].filter(a => a.ok);
  const tabParam = searchParams.get('tab');
  const tab = abas.some(a => a.id === tabParam) ? tabParam! : 'geral';
  const mudarAba = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'geral') next.delete('tab'); else next.set('tab', v);
    setSearchParams(next, { replace: true });
  };
  const mostrarCliente = role === 'admin' || role === 'trabalhador' || role === 'super_admin' || isSuperAdmin;
  const btnCls = 'min-h-10 lg:min-h-9 max-sm:w-full';
  const tableWrap = 'hidden md:block overflow-x-auto';

  return (
    <div className="min-w-0">
      <nav aria-label="Trilha" className="mb-6 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        <Link to="/obras" className="shrink-0 hover:text-foreground">Obras</Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <span className="truncate font-medium text-foreground" aria-current="page">{obra.nome}</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-display font-bold break-words">{obra.nome}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Badge variant="secondary">{statusLabels[obra.status] || obra.status}</Badge>
            {obra.clientes?.nome && <span className="text-sm text-muted-foreground">{obra.clientes.nome}</span>}
            {obra.endereco && <span className="text-sm text-muted-foreground break-words">· {obra.endereco}</span>}
            {obra.data_inicio && (
              <span className="text-sm text-muted-foreground">
                · {new Date(obra.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                {obra.data_fim_prevista && ` a ${new Date(obra.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}`}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end w-full sm:w-auto">
          <Button variant="outline" size="sm" className={btnCls} onClick={handleExportPDF} disabled={exportingPdf}>
            <Download className="h-4 w-4 mr-1" /> {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
          </Button>
          {(isSuperAdmin || isAdmin) && (
            <Button variant="outline" size="sm" className={`${btnCls} text-destructive hover:text-destructive`} onClick={handleCheckDeleteObra}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir Obra
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className={btnCls}>
            <Link to={`/diario?obra=${id}`}><ClipboardList className="h-4 w-4 mr-1" /> Diário</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className={btnCls}>
            <Link to={`/relatorios?obra=${id}`}><FileText className="h-4 w-4 mr-1" /> Relatório</Link>
          </Button>
        </div>
      </div>

      {mostrarCliente && (
        <ClienteCard cliente={obra.clientes ?? null} podeAbrirCadastro={pode('clientes', 'visualizar')} />
      )}

      <Tabs value={tab} onValueChange={mudarAba} className="min-w-0">
        <div className="-mx-1 mb-6 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList ref={tabsListRef} className="h-auto w-max min-w-full justify-start">
            {abas.map(a => (
              <TabsTrigger key={a.id} value={a.id} className="min-h-10 shrink-0 px-3 lg:min-h-8">{a.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="geral" className="mt-0 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 [&>*]:min-w-0 max-md:gap-3 max-md:[&_p]:truncate">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Prazo Contratual</p>
                <p className="text-lg font-display font-bold text-foreground">{obra.prazo_contratual_dias != null ? `${obra.prazo_contratual_dias} dias` : '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> Saldo de Prazo</p>
                <p className={`text-lg font-display font-bold ${saldoPrazo != null && saldoPrazo < 0 ? 'text-destructive' : 'text-success'}`}>
                  {saldoPrazo != null ? `${saldoPrazo} dias` : '—'}
                </p>
              </CardContent>
            </Card>
            {[
              { label: 'Total Contrato', value: financeiro.contrato, color: 'text-foreground' },
              { label: 'Recebido', value: financeiro.recebido, color: 'text-success' },
              { label: 'A Receber', value: financeiro.aReceber, color: 'text-warning' },
              { label: 'Gastos', value: financeiro.gasto, color: 'text-destructive' },
              { label: 'Saldo', value: financeiro.saldo, color: financeiro.saldo < 0 ? 'text-destructive' : 'text-success' },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-display font-bold ${item.color}`}>{fmt(item.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {financeiro.saldo < 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              ⚠️ Atenção: Saldo negativo! Os gastos superam os recebimentos em {fmt(Math.abs(financeiro.saldo))}.
            </div>
          )}
          {atrasadas > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
              ⏰ {atrasadas} parcela{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}!
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] [&>*]:min-w-0">
            {pode('cronograma', 'visualizar') && <AndamentoPrazoCard obraId={id!} ativo={tab === 'geral'} />}
            <div className="min-w-0"><TimelineObra obraId={id!} obraData={obra} /></div>
          </div>
        </TabsContent>

        {pode('cronograma', 'visualizar') && (
          <TabsContent value="cronograma" className="mt-0"><CronogramaAba obraId={id!} ativo={tab === 'cronograma'} /></TabsContent>
        )}
        {pode('diario_obra', 'visualizar') && (
          <TabsContent value="diario" className="mt-0"><DiarioAba obraId={id!} ativo={tab === 'diario'} /></TabsContent>
        )}
        {pode('relatorios', 'visualizar') && (
          <TabsContent value="relatorios" className="mt-0"><RelatoriosAba obraId={id!} ativo={tab === 'relatorios'} /></TabsContent>
        )}
        {pode('relatorio_final', 'visualizar') && (
          <TabsContent value="laudos" className="mt-0"><LaudosAba obraId={id!} ativo={tab === 'laudos'} /></TabsContent>
        )}

        {/* Financeiro fica sempre montado (oculto) para o gráfico continuar disponível na exportação do PDF */}
        <TabsContent value="financeiro" forceMount className="mt-0 space-y-6 data-[state=inactive]:hidden">
          {financeiro.contrato > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Visão Financeira</CardTitle></CardHeader>
              <CardContent>
                <div ref={chartRef} className="w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {pode('financeiro', 'visualizar') && (<>
          <Card className="min-w-0">
            <CardHeader><CardTitle className="font-display">Parcelas</CardTitle></CardHeader>
            <CardContent>
              {parcelas.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma parcela registrada.</p>
              ) : (<>
                <div className={tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Recebimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Forma Pgto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map((p) => (
                      <TableRow key={p.id} className={p.status === 'atrasado' ? 'bg-destructive/5' : ''}>
                        <TableCell>{p.numero_parcela}</TableCell>
                        <TableCell className="font-medium">{fmt(Number(p.valor))}</TableCell>
                        <TableCell className="data-tech">{new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="data-tech">{p.data_recebimento ? new Date(p.data_recebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="capitalize">{p.forma_pagamento || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <div className="space-y-2 md:hidden">
                  {parcelas.map((p) => (
                    <div key={p.id} className={`rounded-md border p-3 text-sm ${p.status === 'atrasado' ? 'bg-destructive/5' : ''}`}>
                      <div className="flex items-center justify-between gap-2"><span className="font-medium">Parcela {p.numero_parcela} · {fmt(Number(p.valor))}</span>{statusBadge(p.status)}</div>
                      <p className="mt-1 text-xs text-muted-foreground">Venc. {new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')} · Receb. {p.data_recebimento ? new Date(p.data_recebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} · <span className="capitalize">{p.forma_pagamento || '—'}</span></p>
                    </div>
                  ))}
                </div>
              </>)}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader><CardTitle className="font-display">Despesas</CardTitle></CardHeader>
            <CardContent>
              {despesas.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma despesa registrada.</p>
              ) : (<>
                <div className={tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Forma Pgto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesas.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="data-tech">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell><Badge variant="secondary">{tipoLabels[d.tipo] || d.tipo}</Badge></TableCell>
                        <TableCell>{d.descricao}</TableCell>
                        <TableCell className="font-medium text-destructive">{fmt(Number(d.valor))}</TableCell>
                        <TableCell className="capitalize">{d.forma_pagamento || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <div className="space-y-2 md:hidden">
                  {despesas.map((d) => (
                    <div key={d.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2"><span className="min-w-0 break-words font-medium">{d.descricao}</span><span className="shrink-0 font-medium text-destructive">{fmt(Number(d.valor))}</span></div>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}<Badge variant="secondary">{tipoLabels[d.tipo] || d.tipo}</Badge><span className="capitalize">{d.forma_pagamento || '—'}</span></p>
                    </div>
                  ))}
                </div>
              </>)}
            </CardContent>
          </Card>
          </>)}
        </TabsContent>

        {pode('documentos', 'visualizar') && (
          <TabsContent value="documentos" className="mt-0">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-accent" /> Documentos
            </CardTitle>
            <Link to={`/documentacao?obra=${id}`}>
              <Button variant="outline" size="sm" className="min-h-10 lg:min-h-9">Ver Documentos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-display font-bold text-foreground">{docStats.totalArquivos}</p>
                <p className="text-xs text-muted-foreground">Arquivos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-display font-bold text-foreground">{docStats.totalPastas}</p>
                <p className="text-xs text-muted-foreground">Pastas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-display font-bold text-accent">{docStats.pdfs}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><File className="h-3 w-3" /> PDFs</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-display font-bold text-primary">{docStats.imagens}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><FileImage className="h-3 w-3" /> Imagens</p>
              </div>
            </div>
            {docStats.recentFiles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Últimos arquivos</p>
                <div className="space-y-1.5">
                  {docStats.recentFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2 truncate">
                        {f.nome.toLowerCase().endsWith('.pdf') ? <File className="h-3.5 w-3.5 text-accent flex-shrink-0" /> : <FileImage className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                        <span className="truncate">{f.nome}</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {new Date(f.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {docStats.totalArquivos === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum documento anexado.</p>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        )}
        {(pode('funcionarios', 'visualizar') || pode('ferramentas', 'visualizar')) && (
          <TabsContent value="equipe" className="mt-0">
            <EquipeAba obraId={id!} ativo={tab === 'equipe'} funcionarios={pode('funcionarios', 'visualizar')} ferramentas={pode('ferramentas', 'visualizar')} />
          </TabsContent>
        )}
        {(role === 'admin' || role === 'trabalhador') && (
          <TabsContent value="anotacoes" className="mt-0">
            <AnotacoesObra obraId={id!} initialContent={(obra as any)?.anotacoes} />
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Obra Confirm */}
      <AlertDialog open={deleteObraOpen} onOpenChange={setDeleteObraOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Obra</AlertDialogTitle>
            <AlertDialogDescription>{deleteObraMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!deleteObraBlocked && (
              <AlertDialogAction onClick={handleDeleteObra} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
