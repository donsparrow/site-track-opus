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
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, Clock, BarChart3, PenTool, History, Download, Save, Edit, Eye, List, Filter, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { gerarRelatorioPDF } from '@/lib/pdfRelatorio';
import SignatureCanvas from 'react-signature-canvas';

const fmt = (d: string) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); } catch { return d; }
};

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
  const { canEdit, user, role, isAdmin, isSuperAdmin } = useAuth();
  const { filterObras, isObraAllowed, loading: obrasFilterLoading } = useObrasFiltered();
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
  const [prazos, setPrazos] = useState({ contratual: 0, parados: 0, ajustado: 0, trabalhados: 0, saldo: 0, dataInicioReal: '' });
  const [diarios, setDiarios] = useState<any[]>([]);
  const [allEquipe, setAllEquipe] = useState<any[]>([]);
  const [allAtividades, setAllAtividades] = useState<any[]>([]);
  const [allMateriais, setAllMateriais] = useState<any[]>([]);
  const [allOcorrencias, setAllOcorrencias] = useState<any[]>([]);
  const [allImagens, setAllImagens] = useState<any[]>([]);
  const [cronogramaAtividades, setCronogramaAtividades] = useState<any[]>([]);
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
    if (!obrasFilterLoading) {
      supabase.from('obras').select('id, nome, data_inicio, data_fim_prevista, endereco, responsavel, prazo_contratual_dias, clientes(nome, cpf_cnpj, email, telefone)').order('nome').then(({ data }) => setObras(filterObras((data || []) as any[])));
      supabase.from('configuracoes_empresa').select('*').limit(1).single().then(({ data }) => setEmpresa(data));
      loadRelatoriosList();
    }
  }, [obrasFilterLoading]);

  const loadRelatoriosList = async () => {
    const { data } = await supabase
      .from('relatorios')
      .select('*, obras(nome, clientes(nome))')
      .order('created_at', { ascending: false });
    const filtered = (data || []).filter((r: any) => isObraAllowed(r.obra_id) && r.status !== 'excluido');
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

    // Fetch cronograma activities for this obra
    const { data: cronData } = await supabase
      .from('cronograma')
      .select('id')
      .eq('obra_id', selectedObra)
      .maybeSingle();
    if (cronData) {
      const { data: cronAtivs } = await supabase
        .from('cronograma_atividades')
        .select('nome_atividade, data_inicio, data_fim, percentual_concluido, status, peso')
        .eq('cronograma_id', cronData.id)
        .order('ordem');
      setCronogramaAtividades(cronAtivs || []);
    } else {
      setCronogramaAtividades([]);
    }

    // Fetch the FIRST diary entry for this obra (not just the period)
    const { data: primeiroDiario } = await supabase
      .from('diario_obra')
      .select('data')
      .eq('obra_id', selectedObra)
      .order('data', { ascending: true })
      .limit(1)
      .maybeSingle();

    const dataInicioReal = primeiroDiario?.data || '';

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

    // Dias trabalhados = business days from real start to report end
    const diasTrabalhados = (dataInicioReal && periodoFim) ? calcBusinessDays(dataInicioReal, periodoFim) : 0;
    const prazoAjustado = prazoContratual + diasParados;
    const saldoPrazo = prazoAjustado - diasTrabalhados;

    setPrazos({
      contratual: prazoContratual,
      parados: diasParados,
      ajustado: prazoAjustado,
      trabalhados: diasTrabalhados,
      saldo: saldoPrazo,
      dataInicioReal,
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
          snapshot_dados: {
            prazos: { contratual: prazoContratual, parados: diasParados, ajustado: prazoAjustado, trabalhados: diasTrabalhados, saldo: saldoPrazo },
            periodo: { inicio: periodoInicio, fim: periodoFim },
            diarios_count: 0, equipe_count: 0, atividades_count: 0, materiais_count: 0, ocorrencias_count: 0, imagens_count: 0,
          },
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

  // Build a snapshot of the current report content for comparison
  const buildSnapshot = () => ({
    prazos,
    periodo: { inicio: periodoInicio, fim: periodoFim },
    diarios_count: diarios.length,
    equipe_count: allEquipe.length,
    atividades_count: allAtividades.length,
    materiais_count: allMateriais.length,
    ocorrencias_count: allOcorrencias.length,
    imagens_count: allImagens.length,
  });

  // Compare two snapshots to detect changes and generate summary
  const detectChanges = (prev: any, curr: any): { hasChanges: boolean; summary: string } => {
    if (!prev) return { hasChanges: true, summary: 'Criação do relatório' };
    const changes: string[] = [];
    if (prev.prazos?.contratual !== curr.prazos?.contratual) changes.push(`Prazo alterado de ${prev.prazos?.contratual || 0} para ${curr.prazos?.contratual || 0} dias`);
    if (prev.prazos?.parados !== curr.prazos?.parados) changes.push(`Dias parados: ${prev.prazos?.parados || 0} → ${curr.prazos?.parados || 0}`);
    if (prev.prazos?.trabalhados !== curr.prazos?.trabalhados) changes.push(`Dias trabalhados: ${prev.prazos?.trabalhados || 0} → ${curr.prazos?.trabalhados || 0}`);
    if (prev.periodo?.inicio !== curr.periodo?.inicio || prev.periodo?.fim !== curr.periodo?.fim) changes.push('Alteração no período');
    if (prev.imagens_count !== curr.imagens_count) changes.push(`Imagens: ${prev.imagens_count || 0} → ${curr.imagens_count}`);
    if (prev.atividades_count !== curr.atividades_count) changes.push(`Atividades: ${prev.atividades_count || 0} → ${curr.atividades_count}`);
    if (prev.equipe_count !== curr.equipe_count) changes.push(`Equipe: ${prev.equipe_count || 0} → ${curr.equipe_count}`);
    if (prev.materiais_count !== curr.materiais_count) changes.push(`Materiais: ${prev.materiais_count || 0} → ${curr.materiais_count}`);
    if (prev.ocorrencias_count !== curr.ocorrencias_count) changes.push(`Ocorrências: ${prev.ocorrencias_count || 0} → ${curr.ocorrencias_count}`);
    return {
      hasChanges: changes.length > 0,
      summary: changes.length > 0 ? changes.join('; ') : '',
    };
  };

  const handleSalvar = async () => {
    if (!relatorioId) { toast.error('Consolide os dados primeiro'); return; }
    setSaving(true);

    try {
      await supabase.from('relatorios').update({
        prazo_contratual_dias_uteis: prazos.contratual,
        dias_parados: prazos.parados,
        dias_trabalhados: prazos.trabalhados,
        prazo_ajustado: prazos.ajustado,
        saldo_prazo: prazos.saldo,
        data_inicio: periodoInicio,
        data_fim: periodoFim,
      }).eq('id', relatorioId);

      // Check if content actually changed compared to last version
      const currentSnapshot = buildSnapshot();
      const lastSnapshot = versoes.length > 0 ? versoes[0]?.snapshot_dados : null;
      const { hasChanges, summary } = detectChanges(lastSnapshot as any, currentSnapshot);

      if (hasChanges && user) {
        const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorioId,
          numero_versao: nextVersion,
          criado_por: user.id,
          status: 'rascunho',
          descricao_alteracao: summary,
          snapshot_dados: currentSnapshot,
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: 'salvou (com alterações)',
        });
        toast.success('Relatório salvo — nova versão registrada!');
      } else {
        if (user) {
          await supabase.from('relatorio_logs').insert({
            relatorio_id: relatorioId,
            usuario_id: user.id,
            acao: 'salvou (sem alterações)',
          });
        }
        toast.success('Relatório salvo (sem alterações no conteúdo).');
      }

      // Reload versions
      const { data: vers } = await supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorioId).order('numero_versao', { ascending: false });
      setVersoes(vers || []);
      await loadRelatoriosList();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    }
    setSaving(false);
  };

  const handleGerarPDF = async () => {
    if (!obraData) { toast.error('Selecione uma obra e consolide os dados'); return; }
    if (!empresa) { toast.info('Dados da empresa não configurados. O PDF será gerado sem cabeçalho/logo.'); }
    setGenerating(true);

    try {
      // Check if content changed since last version to decide revision increment
      const currentSnapshot = buildSnapshot();
      const lastSnapshot = versoes.length > 0 ? versoes[0]?.snapshot_dados : null;
      const { hasChanges, summary } = detectChanges(lastSnapshot as any, currentSnapshot);

      // Only increment revision if there are actual changes
      let pdfRevisao = revisaoPdf;
      if (hasChanges && revisaoPdf > 0) {
        pdfRevisao = revisaoPdf; // current revision already reflects changes
      }
      // If first generation (rev 0) or no changes, keep current revision
      const revLabel = `REV ${String(pdfRevisao).padStart(2, '0')}`;

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
        cronograma: cronogramaAtividades,
        assinaturas,
        versao: pdfRevisao,
        versoes: versoes.map(v => ({
          rev: `REV ${String(v.numero_versao).padStart(2, '0')}`,
          data: new Date(v.data_criacao).toLocaleDateString('pt-BR'),
          resumo: v.descricao_alteracao || '—',
        })),
      });

      if (relatorioId && user) {
        if (hasChanges) {
          // Increment revision only on actual changes
          const nextRevisao = revisaoPdf + 1;
          const newStatus = `gerado pdf rev${String(nextRevisao).padStart(2, '0')}`;
          await supabase.from('relatorios').update({
            revisao_pdf: nextRevisao,
            status: newStatus,
          } as any).eq('id', relatorioId);
          setRevisaoPdf(nextRevisao);

          const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
          await supabase.from('relatorio_versoes').insert({
            relatorio_id: relatorioId,
            numero_versao: nextVersion,
            criado_por: user.id,
            status: newStatus,
            descricao_alteracao: summary,
            snapshot_dados: currentSnapshot,
          });

          await supabase.from('relatorio_logs').insert({
            relatorio_id: relatorioId,
            usuario_id: user.id,
            acao: `gerou PDF ${revLabel} (com alterações)`,
          });

          toast.success(`PDF ${revLabel} gerado — nova revisão criada!`);
        } else {
          // No changes — just download, no new revision
          await supabase.from('relatorio_logs').insert({
            relatorio_id: relatorioId,
            usuario_id: user.id,
            acao: `baixou PDF ${revLabel} (sem alterações)`,
          });

          toast.success(`PDF ${revLabel} gerado (mesma revisão, sem alterações).`);
        }

        // Reload versions
        const { data: vers } = await supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorioId).order('numero_versao', { ascending: false });
        setVersoes(vers || []);
        await loadRelatoriosList();
      } else {
        toast.success('PDF gerado!');
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
    // Prazo will be fetched from obra during consolidation
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

  const podeExcluir = isAdmin || isSuperAdmin;

  const handleExcluirRelatorio = async (relatorio: any) => {
    const { error } = await supabase
      .from('relatorios')
      .update({ status: 'excluido' })
      .eq('id', relatorio.id);

    if (error) {
      toast.error('Erro ao excluir relatório');
      return;
    }

    // Log the deletion
    if (user) {
      await supabase.from('relatorio_logs').insert({
        relatorio_id: relatorio.id,
        usuario_id: user.id,
        acao: 'excluiu',
      });
    }

    toast.success('Relatório excluído com sucesso');
    loadRelatoriosList();
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
          <Button onClick={() => { setRelatorioId(null); setSelectedObra(''); setPeriodoInicio(''); setPeriodoFim(''); setViewMode('edit'); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
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
                                  <AlertDialogAction onClick={() => handleExcluirRelatorio(r)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Confirmar Exclusão
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-2xl font-bold">{prazos.contratual}</span>
                <span className="text-sm text-muted-foreground">(definido na aba Obras)</span>
                {prazos.dataInicioReal ? (
                  <Badge variant="outline" className="text-xs">Início real: {fmt(prazos.dataInicioReal)}</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Obra ainda não iniciada</Badge>
                )}
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
            <TabsList className="flex-wrap">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="evolucao">Evolução Diária</TabsTrigger>
              <TabsTrigger value="assinaturas">Assinaturas ({assinaturas.length})</TabsTrigger>
              <TabsTrigger value="versoes"><History className="h-3 w-3 mr-1" />Histórico ({versoes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo">
              {/* Executive Summary */}
              {(() => {
                const totalPeso = cronogramaAtividades.reduce((s: number, c: any) => s + (c.peso || 0), 0);
                const progressoObra = cronogramaAtividades.length > 0
                  ? (totalPeso === 100
                    ? Math.round(cronogramaAtividades.reduce((s: number, c: any) => s + ((c.peso || 0) * c.percentual_concluido), 0) / 100)
                    : Math.round(cronogramaAtividades.reduce((s: number, c: any) => s + c.percentual_concluido, 0) / cronogramaAtividades.length))
                  : 0;
                const statusObra = prazos.saldo > 0 ? 'Dentro do prazo' : prazos.saldo === 0 ? 'Atenção' : 'Atrasado';
                const statusClr = prazos.saldo > 0 ? 'text-success' : prazos.saldo === 0 ? 'text-warning' : 'text-destructive';
                const statusBg = prazos.saldo > 0 ? 'bg-success/10 border-success/30' : prazos.saldo === 0 ? 'bg-warning/10 border-warning/30' : 'bg-destructive/10 border-destructive/30';

                // Team stats
                const diasComEquipe = diarios.map(d => ({
                  equipe: allEquipe.filter(e => e.diario_id === d.id),
                })).filter(d => d.equipe.length > 0);
                const teamCounts = diasComEquipe.map(d => d.equipe.length);
                const teamMedia = teamCounts.length > 0 ? Math.round(teamCounts.reduce((s, c) => s + c, 0) / teamCounts.length) : 0;
                const teamMax = teamCounts.length > 0 ? Math.max(...teamCounts) : 0;
                const teamMin = teamCounts.length > 0 ? Math.min(...teamCounts) : 0;

                return (
                  <div className="space-y-4">
                    {/* Status + Progress */}
                    <Card className={`border ${statusBg}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl ${statusClr}`}>●</span>
                            <div>
                              <p className={`font-bold text-lg ${statusClr}`}>{statusObra}</p>
                              <p className="text-xs text-muted-foreground">Obra concluída: {progressoObra}%</p>
                            </div>
                          </div>
                          <span className="text-3xl font-bold text-primary">{progressoObra}%</span>
                        </div>
                        <Progress value={progressoObra} className="h-3" />
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4 pb-4">
                          <p className="text-xs text-muted-foreground">Diários</p>
                          <p className="text-2xl font-bold font-display">{diarios.length}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 pb-4">
                          <p className="text-xs text-muted-foreground">Equipe Média</p>
                          <p className="text-2xl font-bold font-display">{teamMedia}</p>
                          <p className="text-[10px] text-muted-foreground">Máx: {teamMax} | Mín: {teamMin}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 pb-4">
                          <p className="text-xs text-muted-foreground">Atividades</p>
                          <p className="text-2xl font-bold font-display">{allAtividades.length}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 pb-4">
                          <p className="text-xs text-muted-foreground">Ocorrências</p>
                          <p className="text-2xl font-bold font-display">{allOcorrencias.length}</p>
                          <p className="text-[10px] text-destructive">
                            {allOcorrencias.filter(o => o.impacto === 'alto').length} alto impacto
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Cronograma summary */}
                    {cronogramaAtividades.length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm font-display">Cronograma da Obra</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {cronogramaAtividades.map((c: any, i: number) => (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-8">{c.peso || 0}%</span>
                                <span className="text-sm flex-1 truncate">{c.nome_atividade}</span>
                                <Progress value={c.percentual_concluido} className="h-2 w-24" />
                                <span className="text-xs font-medium w-10 text-right">{c.percentual_concluido}%</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {c.status === 'concluido' ? 'Concluído' : c.status === 'em_andamento' ? 'Em Andamento' : 'Não Iniciado'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="evolucao">
              <div className="space-y-6">
                {/* Evolução das Atividades por Dia */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-display">Evolução das Atividades por Dia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {diarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Consolide os dados para visualizar</p>
                    ) : (() => {
                      // Group activities by description, then show daily evolution
                      const atividadesByDesc = new Map<string, { diarioData: string; percentual: number; descricao: string }[]>();
                      diarios.forEach(diario => {
                        const diaAtividades = allAtividades.filter(a => a.diario_id === diario.id);
                        diaAtividades.forEach(a => {
                          const key = a.descricao;
                          if (!atividadesByDesc.has(key)) atividadesByDesc.set(key, []);
                          atividadesByDesc.get(key)!.push({ diarioData: diario.data, percentual: a.percentual || 0, descricao: a.descricao });
                        });
                      });

                      if (atividadesByDesc.size === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade no período</p>;

                      return (
                        <div className="space-y-4">
                          {Array.from(atividadesByDesc.entries()).map(([desc, entries]) => {
                            const sorted = entries.sort((a, b) => a.diarioData.localeCompare(b.diarioData));
                            return (
                              <div key={desc} className="border rounded-lg p-3">
                                <p className="font-medium text-sm mb-2">{desc}</p>
                                <div className="space-y-1">
                                  {sorted.map((entry, idx) => {
                                    const prevPerc = idx > 0 ? sorted[idx - 1].percentual : 0;
                                    const evolucao = entry.percentual - prevPerc;
                                    return (
                                      <div key={`${entry.diarioData}-${idx}`} className="flex items-center gap-3 text-xs">
                                        <span className="text-muted-foreground w-20">{fmt(entry.diarioData)}</span>
                                        <span className="w-24">anterior: {prevPerc}%</span>
                                        <span className="w-20">atual: {entry.percentual}%</span>
                                        <Badge variant={evolucao > 0 ? 'default' : evolucao === 0 ? 'outline' : 'destructive'} className="text-xs">
                                          {evolucao > 0 ? '+' : ''}{evolucao}%
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Equipe por Dia */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-display">Equipe por Dia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {diarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Consolide os dados para visualizar</p>
                    ) : (() => {
                      const diasComEquipe = diarios.map(d => ({
                        data: d.data,
                        equipe: allEquipe.filter(e => e.diario_id === d.id),
                      })).filter(d => d.equipe.length > 0);

                      if (diasComEquipe.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro de equipe no período</p>;

                      return (
                        <div className="space-y-3">
                          {diasComEquipe.map(dia => {
                            // Group by function
                            const byFuncao = new Map<string, number>();
                            dia.equipe.forEach(e => {
                              const key = e.funcao || 'Sem função';
                              byFuncao.set(key, (byFuncao.get(key) || 0) + 1);
                            });
                            return (
                              <div key={dia.data} className="border rounded-lg p-3">
                                <p className="font-medium text-sm mb-1">{fmt(dia.data)}</p>
                                <div className="flex flex-wrap gap-2">
                                  {Array.from(byFuncao.entries()).map(([funcao, count]) => (
                                    <Badge key={funcao} variant="secondary" className="text-xs">
                                      {count} {funcao}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
