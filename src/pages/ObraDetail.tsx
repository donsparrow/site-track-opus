import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList, FileText, Clock, Timer, Download, Trash2, FolderOpen, FileImage, File } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import AnotacoesObra from '@/components/AnotacoesObra';
import TimelineObra from '@/components/TimelineObra';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { gerarDashboardPDF } from '@/lib/pdfDashboard';

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

export default function ObraDetail() {
  const { id } = useParams<{ id: string }>();
  const { canEdit, role, isSuperAdmin, isAdmin } = useAuth();
  const { pode, loading: permissionsLoading } = usePermissions();
  const [obra, setObra] = useState<any>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [financeiro, setFinanceiro] = useState({ contrato: 0, recebido: 0, aReceber: 0, gasto: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [saldoPrazo, setSaldoPrazo] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Documentos
  const [docStats, setDocStats] = useState<{ totalPastas: number; totalArquivos: number; pdfs: number; imagens: number; recentFiles: { nome: string; tipo: string; created_at: string }[] }>({
    totalPastas: 0, totalArquivos: 0, pdfs: 0, imagens: 0, recentFiles: [],
  });

  // Delete obra
  const [deleteObraOpen, setDeleteObraOpen] = useState(false);
  const [deleteObraBlocked, setDeleteObraBlocked] = useState(false);
  const [deleteObraMsg, setDeleteObraMsg] = useState('');

  const { isObraAllowed, loading: obrasFilterLoading } = useObrasFiltered();

  useEffect(() => {
    if (!id) return;
    if (!obrasFilterLoading && !permissionsLoading) fetchData();
  }, [id, obrasFilterLoading, permissionsLoading]);

  const fetchData = async () => {
    setLoading(true);

    const { data: obraData } = await supabase
      .from('obras')
      .select('*, clientes(nome)')
      .eq('id', id!)
      .single();

    if (obraData && !isObraAllowed(obraData.id)) {
      setObra(null);
      setLoading(false);
      return;
    }

    setObra(obraData);


    const { data: latestRelatorio } = await supabase
      .from('relatorios')
      .select('saldo_prazo')
      .eq('obra_id', id!)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setSaldoPrazo(latestRelatorio?.saldo_prazo ?? null);

    const { data: receitas } = await supabase.from('receitas').select('id, valor_total').eq('obra_id', id!);
    const totalContrato = (receitas || []).reduce((s, r) => s + Number(r.valor_total), 0);
    const receitaIds = (receitas || []).map(r => r.id);

    let allParcelas: Parcela[] = [];
    if (receitaIds.length > 0) {
      const { data } = await supabase
        .from('parcelas')
        .select('*')
        .in('receita_id', receitaIds)
        .order('data_vencimento');
      allParcelas = (data || []) as Parcela[];
    }

    const today = new Date().toISOString().split('T')[0];
    allParcelas = allParcelas.map(p => ({
      ...p,
      status: p.data_recebimento ? 'recebido' : (p.data_vencimento < today ? 'atrasado' : 'pendente')
    }));
    setParcelas(allParcelas);

    const totalRecebido = allParcelas.filter(p => p.status === 'recebido').reduce((s, p) => s + Number(p.valor), 0);
    const totalAReceber = allParcelas.filter(p => p.status !== 'recebido').reduce((s, p) => s + Number(p.valor), 0);

    const { data: despesasData } = await supabase.from('despesas').select('*').eq('obra_id', id!).order('data', { ascending: false });
    setDespesas((despesasData || []) as Despesa[]);
    const totalGasto = (despesasData || []).reduce((s, d) => s + Number(d.valor), 0);

    const saldoCalc = totalRecebido - totalGasto;
    setFinanceiro({
      contrato: totalContrato,
      recebido: totalRecebido,
      aReceber: totalAReceber,
      gasto: totalGasto,
      saldo: saldoCalc,
    });

    // Fetch document stats (always fetch, render is gated by permission)
    {
      const { data: pastas } = await supabase.from('documentos_pastas').select('id').eq('obra_id', id!);
      const pastaIds = (pastas || []).map(p => p.id);
      if (pastaIds.length > 0) {
        const { data: arquivos } = await supabase
          .from('documentos_arquivos')
          .select('nome_arquivo, tipo, created_at')
          .in('pasta_id', pastaIds)
          .order('created_at', { ascending: false });
        const files = arquivos || [];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const pdfs = files.filter(f => f.tipo === 'pdf' || f.nome_arquivo.toLowerCase().endsWith('.pdf')).length;
        const imgs = files.filter(f => imageExts.some(ext => f.nome_arquivo.toLowerCase().endsWith(`.${ext}`))).length;
        setDocStats({
          totalPastas: pastaIds.length,
          totalArquivos: files.length,
          pdfs,
          imagens: imgs,
          recentFiles: files.slice(0, 5).map(f => ({ nome: f.nome_arquivo, tipo: f.tipo, created_at: f.created_at })),
        });
      } else {
        setDocStats({ totalPastas: 0, totalArquivos: 0, pdfs: 0, imagens: 0, recentFiles: [] });
      }
    }

    setLoading(false);
  };

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
      window.location.href = '/dashboard';
    }
    setDeleteObraOpen(false);
  };

  const handleExportPDF = useCallback(async () => {
    if (!obra) return;
    setExportingPdf(true);
    try {
      const { data: empresaData } = await supabase.from('configuracoes_empresa').select('*').limit(1).single();

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
          nome: obra.nome, endereco: obra.endereco, responsavel: obra.responsavel,
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

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{obra.nome}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Badge variant="secondary">{statusLabels[obra.status] || obra.status}</Badge>
            {obra.clientes?.nome && <span className="text-sm text-muted-foreground">{obra.clientes.nome}</span>}
            {obra.endereco && <span className="text-sm text-muted-foreground">· {obra.endereco}</span>}
            {obra.data_inicio && (
              <span className="text-sm text-muted-foreground">
                · {new Date(obra.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                {obra.data_fim_prevista && ` a ${new Date(obra.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exportingPdf}>
            <Download className="h-4 w-4 mr-1" /> {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
          </Button>
          {(isSuperAdmin || isAdmin) && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleCheckDeleteObra}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir Obra
            </Button>
          )}
          <Link to={`/diario?obra=${id}`}>
            <Button variant="outline" size="sm"><ClipboardList className="h-4 w-4 mr-1" /> Diário</Button>
          </Link>
          <Link to={`/relatorios?obra=${id}`}>
            <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Relatório</Button>
          </Link>
        </div>
      </div>

      {/* Prazo + Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
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
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          ⚠️ Atenção: Saldo negativo! Os gastos superam os recebimentos em {fmt(Math.abs(financeiro.saldo))}.
        </div>
      )}
      {atrasadas > 0 && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          ⏰ {atrasadas} parcela{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}!
        </div>
      )}

      {/* Financial Chart */}
      {financeiro.contrato > 0 && (
        <Card className="mb-8">
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

      {/* Parcelas table - read only */}
      <Card className="mb-8">
        <CardHeader><CardTitle className="font-display">Parcelas</CardTitle></CardHeader>
        <CardContent>
          {parcelas.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma parcela registrada.</p>
          ) : (
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
                    <TableCell>{new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{p.data_recebimento ? new Date(p.data_recebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="capitalize">{p.forma_pagamento || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Despesas table - read only */}
      <Card className="mb-8">
        <CardHeader><CardTitle className="font-display">Despesas</CardTitle></CardHeader>
        <CardContent>
          {despesas.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma despesa registrada.</p>
          ) : (
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
                    <TableCell>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell><Badge variant="secondary">{tipoLabels[d.tipo] || d.tipo}</Badge></TableCell>
                    <TableCell>{d.descricao}</TableCell>
                    <TableCell className="font-medium text-destructive">{fmt(Number(d.valor))}</TableCell>
                    <TableCell className="capitalize">{d.forma_pagamento || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documentos card */}
      {pode('documentos', 'visualizar') && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-accent" /> Documentos
            </CardTitle>
            <Link to={`/documentacao?obra=${id}`}>
              <Button variant="outline" size="sm">Ver Documentos</Button>
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
      )}

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

      {/* Timeline */}
      <TimelineObra obraId={id!} obraData={obra} />

      {(role === 'admin' || role === 'trabalhador') && (
        <div className="mt-8">
          <AnotacoesObra obraId={id!} initialContent={(obra as any)?.anotacoes} />
        </div>
      )}
    </div>
  );
}
