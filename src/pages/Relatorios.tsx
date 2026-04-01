import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Calendar, Clock, BarChart3, PenTool, History, Download, Save, Edit, Eye, List, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { gerarRelatorioPDF } from '@/lib/pdfRelatorio';
import SignatureCanvas from 'react-signature-canvas';

function calcBusinessDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

type ViewMode = 'list' | 'edit';

export default function Relatorios() {
  const { canEdit, user, role } = useAuth();
  const { filterObras, isObraAllowed } = useObrasFiltered();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState('');
  const [obraData, setObraData] = useState<any>(null);
  const [revisaoPdf, setRevisaoPdf] = useState<number>(0);

  // Period
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  // Prazo contratual comes from obra (read-only)

  // Computed data
  const [prazos, setPrazos] = useState({ contratual: 0, parados: 0, ajustado: 0, trabalhados: 0, saldo: 0 });
  const [diarios, setDiarios] = useState<any[]>([]);
  const [allEquipe, setAllEquipe] = useState<any[]>([]);
  const [allAtividades, setAllAtividades] = useState<any[]>([]);
  const [allMateriais, setAllMateriais] = useState<any[]>([]);
  const [allOcorrencias, setAllOcorrencias] = useState<any[]>([]);
  const [allImagens, setAllImagens] = useState<any[]>([]);
  const [paralisacoes, setParalisacoes] = useState<any[]>([]);

  // Versions & signatures
  const [relatorioId, setRelatorioId] = useState<string | null>(null);
  const [versoes, setVersoes] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empresa, setEmpresa] = useState<any>(null);

  // Listing
  const [relatoriosList, setRelatoriosList] = useState<any[]>([]);
  const [filtroObra, setFiltroObra] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const sigRef = useRef<SignatureCanvas>(null);
  const [signName, setSignName] = useState('');
  const [signCargo, setSignCargo] = useState('');
  const [signTipo, setSignTipo] = useState('responsavel_tecnico');

  useEffect(() => {
    supabase.from('obras').select('id, nome, data_inicio, data_fim_prevista, endereco, responsavel, prazo_contratual_dias, clientes(nome, cpf_cnpj, email, telefone)').order('nome').then(({ data }) => setObras(filterObras((data || []) as any[])));
    supabase.from('configuracoes_empresa').select('*').limit(1).single().then(({ data }) => setEmpresa(data));
    loadRelatoriosList();
  }, []);

  const loadRelatoriosList = async () => {
    const { data } = await supabase
      .from('relatorios')
      .select('*, obras(nome, clientes(nome))')
      .order('created_at', { ascending: false });
    const filtered = (data || []).filter((r: any) => isObraAllowed(r.obra_id));
    setRelatoriosList(filtered);
  };

  useEffect(() => {
    if (selectedObra) {
      const obra = obras.find(o => o.id === selectedObra);
      setObraData(obra);
      if (obra?.data_inicio) setPeriodoInicio(obra.data_inicio);
      if (obra?.data_fim_prevista) setPeriodoFim(obra.data_fim_prevista);
    }
  }, [selectedObra, obras]);

  const consolidar = async () => {
    if (!selectedObra || !periodoInicio || !periodoFim) return;

    const { data: diariosList } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', selectedObra)
      .gte('data', periodoInicio)
      .lte('data', periodoFim)
      .order('data');
    const dList = diariosList || [];
    setDiarios(dList);

    const diarioIds = dList.map(d => d.id);

    if (diarioIds.length > 0) {
      const [eq, at, mt, oc, im, pa] = await Promise.all([
        supabase.from('diario_equipe').select('*').in('diario_id', diarioIds),
        supabase.from('diario_atividades').select('*').in('diario_id', diarioIds),
        supabase.from('diario_materiais').select('*').in('diario_id', diarioIds),
        supabase.from('diario_ocorrencias').select('*').in('diario_id', diarioIds),
        supabase.from('diario_imagens').select('*').in('diario_id', diarioIds),
        supabase.from('diario_paralisacoes').select('*').in('diario_id', diarioIds),
      ]);
      setAllEquipe(eq.data || []);
      setAllAtividades(at.data || []);
      setAllMateriais(mt.data || []);
      setAllOcorrencias(oc.data || []);
      setAllImagens(im.data || []);
      setParalisacoes(pa.data || []);
    } else {
      setAllEquipe([]); setAllAtividades([]); setAllMateriais([]); setAllOcorrencias([]); setAllImagens([]); setParalisacoes([]);
    }

    const obra = obras.find(o => o.id === selectedObra);
    const prazoContratual = (obra?.prazo_contratual_dias && obra.prazo_contratual_dias > 0)
      ? obra.prazo_contratual_dias
      : (obra?.data_inicio && obra?.data_fim_prevista
        ? calcBusinessDays(obra.data_inicio, obra.data_fim_prevista)
        : 0);

    let diasParados = 0;
    if (diarioIds.length > 0) {
      const { data: parData } = await supabase
        .from('diario_paralisacoes')
        .select('total_dias')
        .in('diario_id', diarioIds);
      diasParados = (parData || []).reduce((s, p) => s + (p.total_dias || 0), 0);
    }

    const diasTrabalhados = (periodoInicio && periodoFim) ? calcBusinessDays(periodoInicio, periodoFim) : 0;
    const prazoAjustado = prazoContratual + diasParados;
    const saldoPrazo = prazoAjustado - diasTrabalhados;

    setPrazos({
      contratual: prazoContratual,
      parados: diasParados,
      ajustado: prazoAjustado,
      trabalhados: diasTrabalhados,
      saldo: saldoPrazo,
    });

    // Find or create relatorio
    let { data: relatorio } = await supabase
      .from('relatorios')
      .select('id, status, prazo_contratual_dias_uteis, revisao_pdf')
      .eq('obra_id', selectedObra)
      .gte('data_inicio', periodoInicio)
      .lte('data_fim', periodoFim)
      .single();

    if (!relatorio) {
      const { data: newRel } = await supabase
        .from('relatorios')
        .insert({
          obra_id: selectedObra,
          data_inicio: periodoInicio,
          data_fim: periodoFim,
          prazo_contratual_dias_uteis: prazoContratual,
          dias_parados: diasParados,
          dias_trabalhados: diasTrabalhados,
          prazo_ajustado: prazoAjustado,
          saldo_prazo: saldoPrazo,
          status: 'rascunho',
        })
        .select()
        .single();
      relatorio = newRel;
      setRevisaoPdf(0);

      if (relatorio && user) {
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorio.id,
          numero_versao: 1,
          criado_por: user.id,
          status: 'rascunho',
          descricao_alteracao: 'Criação do relatório',
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorio.id,
          usuario_id: user.id,
          acao: 'criou',
        });
      }
    } else {
      // Prazo comes from obra (single source of truth)
      setRevisaoPdf((relatorio as any).revisao_pdf || 0);

      await supabase.from('relatorios').update({
        prazo_contratual_dias_uteis: prazoContratual,
        dias_parados: diasParados,
        dias_trabalhados: diasTrabalhados,
        prazo_ajustado: prazoAjustado,
        saldo_prazo: saldoPrazo,
      }).eq('id', relatorio.id);
    }

    if (relatorio) {
      setRelatorioId(relatorio.id);
      const { data: vers } = await supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorio.id).order('numero_versao', { ascending: false });
      setVersoes(vers || []);
      const { data: assin } = await supabase.from('assinaturas').select('*').eq('relatorio_id', relatorio.id).order('data_assinatura');
      setAssinaturas(assin || []);
    }

    toast.success('Dados consolidados!');
  };

  const handleSalvar = async () => {
    if (!relatorioId) { toast.error('Consolide os dados primeiro'); return; }
    setSaving(true);

    try {
      const prazoVal = prazoContratualManual !== null ? prazoContratualManual : prazos.contratual;
      await supabase.from('relatorios').update({
        prazo_contratual_dias_uteis: prazoVal,
        dias_parados: prazos.parados,
        dias_trabalhados: prazos.trabalhados,
        prazo_ajustado: prazos.ajustado,
        saldo_prazo: prazos.saldo,
        data_inicio: periodoInicio,
        data_fim: periodoFim,
      }).eq('id', relatorioId);

      // Create new version
      if (user) {
        const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorioId,
          numero_versao: nextVersion,
          criado_por: user.id,
          status: 'rascunho',
          descricao_alteracao: 'Relatório salvo',
          snapshot_dados: {
            prazos,
            periodo: { inicio: periodoInicio, fim: periodoFim },
            diarios_count: diarios.length,
            equipe_count: allEquipe.length,
            atividades_count: allAtividades.length,
            materiais_count: allMateriais.length,
            ocorrencias_count: allOcorrencias.length,
            imagens_count: allImagens.length,
          },
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: 'salvou',
        });
      }

      // Reload versions
      const { data: vers } = await supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorioId).order('numero_versao', { ascending: false });
      setVersoes(vers || []);
      await loadRelatoriosList();

      toast.success('Relatório salvo com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    }
    setSaving(false);
  };

  const handleGerarPDF = async () => {
    if (!obraData) { toast.error('Selecione uma obra e consolide os dados'); return; }
    if (!empresa) { toast.info('Dados da empresa não configurados. O PDF será gerado sem cabeçalho/logo.'); }
    setGenerating(true);
    const newRevisao = revisaoPdf;
    const revLabel = `REV ${String(newRevisao).padStart(2, '0')}`;
    try {
      // Generate change summary by comparing with previous version snapshot
      let changeSummary = newRevisao === 0 ? 'Relatório inicial criado' : '';
      if (newRevisao > 0 && versoes.length > 0) {
        const prevSnapshot = versoes[0]?.snapshot_dados as any;
        if (prevSnapshot) {
          const changes: string[] = [];
          if (prevSnapshot.prazos?.contratual !== prazos.contratual) changes.push(`Prazo alterado de ${prevSnapshot.prazos?.contratual || 0} para ${prazos.contratual} dias`);
          if (prevSnapshot.imagens_count !== allImagens.length) changes.push(`Imagens: ${prevSnapshot.imagens_count || 0} → ${allImagens.length}`);
          if (prevSnapshot.atividades_count !== allAtividades.length) changes.push(`Atividades: ${prevSnapshot.atividades_count || 0} → ${allAtividades.length}`);
          if (prevSnapshot.ocorrencias_count !== allOcorrencias.length) changes.push(`Ocorrências: ${prevSnapshot.ocorrencias_count || 0} → ${allOcorrencias.length}`);
          if (prevSnapshot.periodo?.inicio !== periodoInicio || prevSnapshot.periodo?.fim !== periodoFim) changes.push('Alteração no período');
          changeSummary = changes.length > 0 ? changes.join('; ') : 'Geração de nova revisão do PDF';
        } else {
          changeSummary = 'Geração de nova revisão do PDF';
        }
      }

      await gerarRelatorioPDF({
        empresa: empresa || null,
        obra: {
          nome: obraData.nome,
          endereco: obraData.endereco || '',
          responsavel: obraData.responsavel || '',
          cliente_nome: obraData.clientes?.nome || '',
          cliente_cpf_cnpj: obraData.clientes?.cpf_cnpj || '',
          cliente_email: obraData.clientes?.email || '',
          cliente_telefone: obraData.clientes?.telefone || '',
        },
        periodo: { inicio: periodoInicio, fim: periodoFim },
        prazos,
        diarios,
        equipe: allEquipe,
        atividades: allAtividades,
        materiais: allMateriais,
        ocorrencias: allOcorrencias,
        imagens: allImagens,
        assinaturas,
        versao: newRevisao,
        versoes: versoes.map(v => ({
          rev: `REV ${String(v.numero_versao).padStart(2, '0')}`,
          data: new Date(v.data_criacao).toLocaleDateString('pt-BR'),
          resumo: v.descricao_alteracao || '—',
        })),
      });
      toast.success(`PDF ${revLabel} gerado!`);

      if (relatorioId && user) {
        // Update revisao_pdf and status
        const nextRevisao = revisaoPdf + 1;
        const newStatus = `gerado pdf rev${String(newRevisao).padStart(2, '0')}`;
        await supabase.from('relatorios').update({
          revisao_pdf: nextRevisao,
          status: newStatus,
        } as any).eq('id', relatorioId);
        setRevisaoPdf(nextRevisao);

        // Create version entry with change summary
        const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorioId,
          numero_versao: nextVersion,
          criado_por: user.id,
          status: newStatus,
          descricao_alteracao: changeSummary,
          snapshot_dados: {
            prazos,
            periodo: { inicio: periodoInicio, fim: periodoFim },
            diarios_count: diarios.length,
            equipe_count: allEquipe.length,
            atividades_count: allAtividades.length,
            materiais_count: allMateriais.length,
            ocorrencias_count: allOcorrencias.length,
            imagens_count: allImagens.length,
          },
        });

        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: `gerou PDF ${revLabel}`,
        });

        // Reload versions
        const { data: vers } = await supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorioId).order('numero_versao', { ascending: false });
        setVersoes(vers || []);
        await loadRelatoriosList();
      }
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
    setGenerating(false);
  };

  const handleOpenRelatorio = async (rel: any) => {
    setSelectedObra(rel.obra_id);
    setPeriodoInicio(rel.data_inicio || '');
    setPeriodoFim(rel.data_fim || '');
    // Always fetch prazo from obras (single source of truth)
    const { data: obraAtual } = await supabase.from('obras').select('prazo_contratual_dias').eq('id', rel.obra_id).single();
    if (obraAtual?.prazo_contratual_dias && obraAtual.prazo_contratual_dias > 0) {
      setPrazoContratualManual(obraAtual.prazo_contratual_dias);
    } else {
      setPrazoContratualManual(null);
    }
    setViewMode('edit');
    // Wait for obra data to load then consolidate
    setTimeout(() => consolidar(), 500);
  };

  const handleSign = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { toast.error('Desenhe sua assinatura'); return; }
    if (!signName || !relatorioId) return;

    const dataUrl = sigRef.current.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    const filePath = `assinaturas/${relatorioId}/${Date.now()}.png`;
    const { error: upErr } = await supabase.storage.from('anexos').upload(filePath, blob);
    if (upErr) { toast.error(upErr.message); return; }
    const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(filePath);

    const { error } = await supabase.from('assinaturas').insert({
      relatorio_id: relatorioId,
      tipo: signTipo,
      nome_assinante: signName,
      cargo: signCargo || null,
      tipo_assinatura: 'desenho',
      assinatura_url: urlData.publicUrl,
    });
    if (error) { toast.error(error.message); return; }

    if (user) {
      const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
      await supabase.from('relatorio_versoes').insert({
        relatorio_id: relatorioId,
        numero_versao: nextVersion,
        criado_por: user.id,
        status: 'assinado',
        descricao_alteracao: `Assinado por ${signName}`,
      });
      await supabase.from('relatorio_logs').insert({
        relatorio_id: relatorioId,
        usuario_id: user.id,
        acao: 'assinou',
      });
    }

    toast.success('Assinatura registrada!');
    setSignOpen(false);
    setSignName(''); setSignCargo('');
    consolidar();
  };

  const filteredRelatorios = relatoriosList.filter(r => {
    if (filtroObra && r.obra_id !== filtroObra) return false;
    if (filtroStatus && r.status !== filtroStatus) return false;
    return true;
  });

  const saldoColor = prazos.saldo > 0 ? 'text-success' : prazos.saldo < 0 ? 'text-destructive' : 'text-foreground';

  const statusBadge = (status: string) => {
    const isRevStatus = status.startsWith('gerado pdf');
    const map: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      rascunho: 'outline',
      finalizado: 'secondary',
      assinado: 'default',
    };
    const variant = isRevStatus ? 'default' : (map[status] || 'outline');
    return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
  };

  // ========== LIST VIEW ==========
  if (viewMode === 'list') {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">Relatórios</h1>
          <Button onClick={() => { setRelatorioId(null); setSelectedObra(''); setPeriodoInicio(''); setPeriodoFim(''); setPrazoContratualManual(null); setViewMode('edit'); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <FileText className="h-4 w-4 mr-2" />Novo Relatório
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label>Filtrar por Obra</Label>
                <Select value={filtroObra} onValueChange={setFiltroObra}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filtrar por Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="assinado">Assinado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => { setFiltroObra(''); setFiltroStatus(''); }}>
                <Filter className="h-4 w-4 mr-2" />Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            {filteredRelatorios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum relatório encontrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obra</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRelatorios.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.obras?.nome || '—'}</TableCell>
                      <TableCell>{r.obras?.clientes?.nome || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {r.data_inicio ? new Date(r.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} a{' '}
                        {r.data_fim ? new Date(r.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenRelatorio(r)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== EDIT VIEW ==========
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Button variant="outline" onClick={() => { setViewMode('list'); loadRelatoriosList(); }}>
          <List className="h-4 w-4 mr-2" />Voltar à Lista
        </Button>
        <h1 className="text-3xl font-display font-bold">{relatorioId ? 'Editar Relatório' : 'Novo Relatório'}</h1>
        {relatorioId && revisaoPdf > 0 && (
          <Badge variant="default" className="text-sm">REV {String(revisaoPdf - 1).padStart(2, '0')}</Badge>
        )}
      </div>

      {/* Obra & Period Selection */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Obra</Label>
              <Select value={selectedObra} onValueChange={setSelectedObra}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
            </div>
            <Button onClick={consolidar} disabled={!selectedObra || !periodoInicio || !periodoFim} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <BarChart3 className="h-4 w-4 mr-2" />Consolidar
            </Button>
          </div>
        </CardContent>
      </Card>

      {relatorioId && (
        <>
          {/* Dados do Cliente */}
          {obraData?.clientes && (
            <Card className="mb-6">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-display">Dados do Cliente</CardTitle>
              </CardHeader>
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

          {/* Prazo Contratual (read-only, from obra) */}
          <Card className="mb-6">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-display">Prazo Contratual (dias úteis)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">{prazos.contratual}</span>
                <span className="text-sm text-muted-foreground">(definido na aba Obras)</span>
              </div>
            </CardContent>
          </Card>

          {/* Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Prazo Contratual', value: `${prazos.contratual} dias`, icon: Calendar },
              { label: 'Dias Parados', value: `${prazos.parados} dias`, icon: Clock, color: 'text-destructive' },
              { label: 'Prazo Ajustado', value: `${prazos.ajustado} dias`, icon: Calendar },
              { label: 'Dias Trabalhados', value: `${prazos.trabalhados} dias`, icon: BarChart3 },
              { label: 'Saldo de Prazo', value: `${prazos.saldo} dias`, icon: Clock, color: saldoColor },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                  <p className={`text-lg font-display font-bold ${item.color || ''}`}>{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {canEdit && (
              <>
                <Button onClick={handleSalvar} disabled={saving} variant="outline">
                  <Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar Relatório'}
                </Button>
                <Button onClick={handleGerarPDF} disabled={generating} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Download className="h-4 w-4 mr-2" />{generating ? 'Gerando...' : 'Gerar PDF'}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setSignOpen(true)}>
              <PenTool className="h-4 w-4 mr-2" />Assinar
            </Button>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="resumo">
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="assinaturas">Assinaturas ({assinaturas.length})</TabsTrigger>
              <TabsTrigger value="versoes"><History className="h-3 w-3 mr-1" />Histórico ({versoes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Diários no Período</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{diarios.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">registros encontrados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Equipe</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{allEquipe.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">registros de equipe</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Atividades</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{allAtividades.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">atividades registradas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Ocorrências</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{allOcorrencias.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {allOcorrencias.filter(o => o.impacto === 'alto').length} de alto impacto
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assinaturas">
              <Card>
                <CardContent className="pt-6">
                  {assinaturas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma assinatura registrada</p>
                  ) : (
                    <div className="space-y-4">
                      {assinaturas.map(a => (
                        <div key={a.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          <img src={a.assinatura_url} alt="Assinatura" className="h-16 w-24 object-contain border rounded" />
                          <div>
                            <p className="font-medium">{a.nome_assinante}</p>
                            {a.cargo && <p className="text-sm text-muted-foreground">{a.cargo}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={a.tipo === 'responsavel_tecnico' ? 'default' : 'secondary'}>
                                {a.tipo === 'responsavel_tecnico' ? 'Resp. Técnico' : 'Cliente'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{new Date(a.data_assinatura + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versoes">
              <Card>
                <CardContent className="pt-6">
                  {versoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma versão</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>REV</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Resumo das Alterações</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {versoes.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-bold">REV {String(v.numero_versao - 1).padStart(2, '0')}</TableCell>
                            <TableCell>
                              <Badge variant={v.status.startsWith('gerado pdf') ? 'default' : v.status === 'assinado' ? 'default' : 'outline'}>
                                {v.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{v.descricao_alteracao || '—'}</TableCell>
                            <TableCell>{new Date(v.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Signature Dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Assinatura Digital</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={signName} onChange={e => setSignName(e.target.value)} required /></div>
            <div><Label>Cargo</Label><Input value={signCargo} onChange={e => setSignCargo(e.target.value)} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={signTipo} onValueChange={setSignTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="responsavel_tecnico">Responsável Técnico</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desenhe sua assinatura</Label>
              <div className="border rounded-lg bg-white">
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{ className: 'w-full h-40', style: { width: '100%', height: '160px' } }}
                  penColor="black"
                />
              </div>
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => sigRef.current?.clear()}>Limpar</Button>
            </div>
            <Button onClick={handleSign} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!signName}>
              Confirmar Assinatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
