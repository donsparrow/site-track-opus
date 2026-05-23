import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadPdf } from '@/lib/pdfDownload';
import { setupPDFHelpers, MARGIN, BLUE } from '@/lib/pdfShared';

interface Atividade {
  id: string;
  cronograma_id: string;
  ordem: number;
  nome_atividade: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  percentual_concluido: number;
  status: string;
  peso: number;
  tipo_atividade?: string;
  observacoes?: string | null;
}

interface Cronograma {
  id: string;
  obra_id: string;
  data_inicio: string | null;
  data_fim_prevista: string | null;
}

interface Aditivo {
  id: string;
  obra_id: string;
  descricao: string;
  dias_adicionais: number;
  data_aprovacao: string | null;
  justificativa: string | null;
  documento_url: string | null;
  responsavel_aprovacao: string | null;
  created_at: string;
}


const statusLabels: Record<string, string> = {
  nao_iniciado: 'Não Iniciado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};
const statusColors: Record<string, string> = {
  nao_iniciado: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  concluido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

export default function Cronograma() {
  const { canEdit, empresaId, isAdmin, isSuperAdmin } = useAuth();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  const [searchParams, setSearchParams] = useSearchParams();
  const obraIdParam = searchParams.get('obra');

  const [obraId, setObraId] = useState(obraIdParam || '');
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [aditivos, setAditivos] = useState<Aditivo[]>([]);
  const [prazoContratual, setPrazoContratual] = useState(0);
  const [primeiroDiario, setPrimeiroDiario] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [formData, setFormData] = useState({ nome_atividade: '', descricao: '', data_inicio: '', data_fim: '', percentual_concluido: 0, status: 'nao_iniciado', peso: 0, tipo_atividade: 'original', observacoes: '' });

  // Aditivo dialog
  const [aditivoDialogOpen, setAditivoDialogOpen] = useState(false);
  const [aditivoForm, setAditivoForm] = useState({ descricao: '', dias_adicionais: 0, data_aprovacao: '', justificativa: '', responsavel_aprovacao: '', documento_url: '' });
  const [deleteAditivoId, setDeleteAditivoId] = useState<string | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const ganttRef = useRef<HTMLDivElement>(null);

  const obraNome = obras.find(o => o.id === obraId)?.nome || '';

  const canEditPeso = isAdmin || isSuperAdmin;

  // Fetch obras
  useEffect(() => {
    if (!obrasFilterLoading) {
      supabase.from('obras').select('id, nome').order('nome').then(({ data }) => {
        setObras(filterObras((data || []) as { id: string; nome: string }[]));
      });
    }
  }, [obrasFilterLoading]);

  useEffect(() => {
    if (obraIdParam && obraIdParam !== obraId) setObraId(obraIdParam);
  }, [obraIdParam]);

  const loadCronograma = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    let { data: cron } = await supabase.from('cronograma').select('*').eq('obra_id', obraId).maybeSingle();
    if (!cron && canEdit) {
      const { data: newCron } = await supabase.from('cronograma').insert({ obra_id: obraId } as any).select().single();
      cron = newCron;
    }
    if (cron) {
      setCronograma(cron as any);
      const { data: ativs } = await supabase.from('cronograma_atividades').select('*').eq('cronograma_id', cron.id).order('ordem', { ascending: true });
      setAtividades((ativs as any[]) || []);
    }
    // Fetch obra prazo + first diary + aditivos
    const [obraRes, diarioRes, aditivosRes] = await Promise.all([
      supabase.from('obras').select('prazo_contratual_dias').eq('id', obraId).maybeSingle(),
      supabase.from('diario_obra').select('data').eq('obra_id', obraId).order('data', { ascending: true }).limit(1),
      supabase.from('obra_aditivos' as any).select('*').eq('obra_id', obraId).order('created_at', { ascending: false }),
    ]);
    setPrazoContratual((obraRes.data as any)?.prazo_contratual_dias || 0);
    setPrimeiroDiario(diarioRes.data?.[0]?.data || null);
    setAditivos(((aditivosRes as any).data as Aditivo[]) || []);
    setLoading(false);
  }, [obraId, canEdit]);

  useEffect(() => { loadCronograma(); }, [loadCronograma]);

  // Weighted progress calculation
  const totalPeso = atividades.reduce((sum, a) => sum + (a.peso || 0), 0);
  const pesoValido = totalPeso === 100;

  const progressoGeral = atividades.length > 0
    ? (totalPeso > 0
      ? Math.round(atividades.reduce((sum, a) => sum + ((a.peso || 0) * a.percentual_concluido), 0) / 100)
      : Math.round(atividades.reduce((sum, a) => sum + a.percentual_concluido, 0) / atividades.length))
    : 0;

  // Business days calculation
  const businessDaysBetween = (from: Date, to: Date) => {
    let count = 0;
    const cur = new Date(from);
    cur.setHours(0,0,0,0);
    const end = new Date(to);
    end.setHours(0,0,0,0);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };
  const diasAditivos = aditivos.reduce((s, a) => s + (a.dias_adicionais || 0), 0);
  const prazoEfetivo = prazoContratual + diasAditivos;
  const diasDecorridos = primeiroDiario ? businessDaysBetween(parseISO(primeiroDiario), new Date()) : 0;
  const prazoConsumido = prazoEfetivo > 0 ? Math.round((diasDecorridos / prazoEfetivo) * 100) : 0;
  const desvio = progressoGeral - prazoConsumido;
  const planejamentoConfigurado = atividades.length > 0;
  const statusObra = !planejamentoConfigurado ? { label: 'Planejamento pendente', color: 'text-muted-foreground', dot: '⚪', cls: 'border-muted/30 bg-muted/10' }
    : !primeiroDiario ? { label: 'Não iniciada', color: 'text-muted-foreground', dot: '●', cls: 'border-muted/30 bg-muted/10' }
    : desvio > 5 ? { label: 'Adiantada', color: 'text-success', dot: '🟢', cls: 'border-success/30 bg-success/10' }
    : desvio >= -5 ? { label: 'Em Dia', color: 'text-warning', dot: '🟡', cls: 'border-warning/30 bg-warning/10' }
    : { label: 'Atrasada', color: 'text-destructive', dot: '🔴', cls: 'border-destructive/30 bg-destructive/10' };



  // Auto-suggest peso when creating
  const suggestPeso = () => {
    const otherCount = editingAtividade ? atividades.length : atividades.length + 1;
    if (otherCount === 0) return 100;
    return Math.floor(100 / otherCount);
  };

  // CRUD
  const openNew = (tipo: 'original' | 'aditivo' = 'original') => {
    setEditingAtividade(null);
    const sugPeso = tipo === 'aditivo' ? 0 : (atividades.length === 0 ? 100 : Math.max(0, 100 - atividades.reduce((s, a) => s + (a.peso || 0), 0)));
    setFormData({ nome_atividade: '', descricao: '', data_inicio: '', data_fim: '', percentual_concluido: 0, status: 'nao_iniciado', peso: sugPeso, tipo_atividade: tipo, observacoes: '' });
    setDialogOpen(true);
  };
  const openEdit = (a: Atividade) => {
    setEditingAtividade(a);
    setFormData({
      nome_atividade: a.nome_atividade,
      descricao: a.descricao || '',
      data_inicio: a.data_inicio || '',
      data_fim: a.data_fim || '',
      percentual_concluido: a.percentual_concluido,
      status: a.status,
      peso: a.peso || 0,
      tipo_atividade: a.tipo_atividade || 'original',
      observacoes: a.observacoes || '',
    });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!formData.nome_atividade || !cronograma) return;
    // Validação peso: somente atividades originais (aditivos somam fora do 100%)
    const otherOriginalPeso = atividades
      .filter(a => (a.tipo_atividade || 'original') === 'original')
      .filter(a => !editingAtividade || a.id !== editingAtividade.id)
      .reduce((s, a) => s + (a.peso || 0), 0);
    if (formData.tipo_atividade === 'original' && otherOriginalPeso + formData.peso > 100) {
      toast.error(`Soma dos pesos do escopo original excede 100% (${otherOriginalPeso + formData.peso}%). Ajuste o peso.`);
      return;
    }
    if (editingAtividade) {
      await supabase.from('cronograma_atividades').update({
        nome_atividade: formData.nome_atividade,
        descricao: formData.descricao || null,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        percentual_concluido: formData.percentual_concluido,
        status: formData.status,
        peso: formData.peso,
        tipo_atividade: formData.tipo_atividade,
        observacoes: formData.observacoes || null,
      } as any).eq('id', editingAtividade.id);
      toast.success('Atividade atualizada');
    } else {
      const maxOrdem = atividades.length > 0 ? Math.max(...atividades.map(a => a.ordem)) : 0;
      await supabase.from('cronograma_atividades').insert({
        cronograma_id: cronograma.id,
        nome_atividade: formData.nome_atividade,
        descricao: formData.descricao || null,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        percentual_concluido: formData.percentual_concluido,
        status: formData.status,
        ordem: maxOrdem + 1,
        peso: formData.peso,
        tipo_atividade: formData.tipo_atividade,
        observacoes: formData.observacoes || null,
      } as any);
      toast.success('Atividade criada');
    }
    setDialogOpen(false);
    loadCronograma();
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('cronograma_atividades').delete().eq('id', deleteId);
    toast.success('Atividade excluída');
    setDeleteId(null);
    loadCronograma();
  };

  // Aditivo CRUD
  const openNewAditivo = () => {
    setAditivoForm({ descricao: '', dias_adicionais: 0, data_aprovacao: '', justificativa: '', responsavel_aprovacao: '', documento_url: '' });
    setAditivoDialogOpen(true);
  };
  const handleSaveAditivo = async () => {
    if (!aditivoForm.descricao || !obraId) { toast.error('Informe a descrição do aditivo'); return; }
    const { error } = await supabase.from('obra_aditivos' as any).insert({
      obra_id: obraId,
      descricao: aditivoForm.descricao,
      dias_adicionais: aditivoForm.dias_adicionais || 0,
      data_aprovacao: aditivoForm.data_aprovacao || null,
      justificativa: aditivoForm.justificativa || null,
      responsavel_aprovacao: aditivoForm.responsavel_aprovacao || null,
      documento_url: aditivoForm.documento_url || null,
    } as any);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Aditivo registrado');
    setAditivoDialogOpen(false);
    loadCronograma();
  };
  const handleDeleteAditivo = async () => {
    if (!deleteAditivoId) return;
    await supabase.from('obra_aditivos' as any).delete().eq('id', deleteAditivoId);
    toast.success('Aditivo excluído');
    setDeleteAditivoId(null);
    loadCronograma();
  };
  const moveAtividade = async (id: string, direction: 'up' | 'down') => {
    const idx = atividades.findIndex(a => a.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === atividades.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const current = atividades[idx];
    const swap = atividades[swapIdx];
    await Promise.all([
      supabase.from('cronograma_atividades').update({ ordem: swap.ordem } as any).eq('id', current.id),
      supabase.from('cronograma_atividades').update({ ordem: current.ordem } as any).eq('id', swap.id),
    ]);
    loadCronograma();
  };

  // Gantt calculations
  const ganttData = (() => {
    const validAtivs = atividades.filter(a => a.data_inicio && a.data_fim);
    if (validAtivs.length === 0) return null;
    const allDates = validAtivs.flatMap(a => [parseISO(a.data_inicio!), parseISO(a.data_fim!)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = Math.max(differenceInDays(maxDate, minDate), 1);
    return { minDate, maxDate, totalDays, validAtivs };
  })();

  // PDF Export
  const exportPDF = async () => {
    const { data: empresaConfig } = await supabase.from('configuracoes_empresa').select('*').limit(1).single();

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentW = pageWidth - MARGIN * 2;

    const helpers = await setupPDFHelpers(doc, empresaConfig as any);

    let y = helpers.addHeader();
    y += 4;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(`Cronograma - ${obraNome}`, MARGIN, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, MARGIN, y);
    doc.text(`Progresso Geral: ${progressoGeral}%`, MARGIN + 80, y);
    y += 6;

    const barW = contentW, barH = 6;
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(MARGIN, y, barW, barH, 2, 2, 'F');
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(MARGIN, y, barW * (progressoGeral / 100), barH, 2, 2, 'F');
    y += 12;

    doc.setTextColor(0);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Atividade', 'Peso', 'Início', 'Fim', 'Progresso', 'Status']],
      body: atividades.map((a, i) => [
        i + 1,
        a.nome_atividade,
        `${a.peso}%`,
        a.data_inicio ? format(parseISO(a.data_inicio), 'dd/MM/yyyy') : '-',
        a.data_fim ? format(parseISO(a.data_fim), 'dd/MM/yyyy') : '-',
        `${a.percentual_concluido}%`,
        statusLabels[a.status] || a.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
      margin: { left: MARGIN, right: MARGIN },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'striped',
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    if (ganttData) {
      let gY = finalY + 10;
      if (gY > pageHeight - 40) {
        doc.addPage();
        gY = helpers.addHeader() + 4;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
      doc.text('Gráfico de Gantt', MARGIN, gY);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      gY += 6;

      const chartX = MARGIN + 50;
      const chartW = contentW - 50;
      const rowH = 8;
      ganttData.validAtivs.forEach((a, i) => {
        const barY = gY + i * (rowH + 2);
        if (barY > pageHeight - 20) return;
        const start = differenceInDays(parseISO(a.data_inicio!), ganttData.minDate);
        const duration = Math.max(differenceInDays(parseISO(a.data_fim!), parseISO(a.data_inicio!)), 1);
        const barStart = chartX + (start / ganttData.totalDays) * chartW;
        const barWidth = Math.max((duration / ganttData.totalDays) * chartW, 4);

        doc.setFontSize(7);
        doc.text(a.nome_atividade, MARGIN, barY + 5.5, { maxWidth: 48 });

        doc.setFillColor(219, 234, 254);
        doc.roundedRect(barStart, barY, barWidth, rowH, 1, 1, 'F');
        const fillW = barWidth * (a.percentual_concluido / 100);
        if (fillW > 0) {
          doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
          doc.roundedRect(barStart, barY, fillW, rowH, 1, 1, 'F');
        }
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text(`${a.percentual_concluido}%`, barStart + barWidth + 2, barY + 5.5);
      });
    }

    helpers.addAllFooters();

    const nome = obraNome.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    downloadPdf(doc, `cronograma_${nome}.pdf`);
    toast.success('PDF exportado com sucesso');
  };

  if (!obraId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Cronograma de Obra</h1>
        <Card>
          <CardContent className="pt-6">
            <Label>Selecione a Obra</Label>
            <Select onValueChange={v => { setObraId(v); setSearchParams({ obra: v }); }}>
              <SelectTrigger><SelectValue placeholder="Escolha uma obra" /></SelectTrigger>
              <SelectContent>
                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cronograma</h1>
          <p className="text-sm text-muted-foreground">{obraNome}</p>
        </div>
        <div className="flex gap-2">
          <Select value={obraId} onValueChange={v => { setObraId(v); setSearchParams({ obra: v }); }}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportPDF}><Download className="h-4 w-4 mr-1" />PDF</Button>
          {canEdit && <Button variant="outline" onClick={openNewAditivo}><Plus className="h-4 w-4 mr-1" />Aditivo</Button>}
          {canEdit && <Button onClick={() => openNew('original')}><Plus className="h-4 w-4 mr-1" />Atividade</Button>}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Progresso da Obra</span>
              {atividades.length > 0 && !pesoValido && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Pesos: {totalPeso}% (devem somar 100%)
                </Badge>
              )}
              {atividades.length > 0 && pesoValido && (
                <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                  Pesos: 100% ✓
                </Badge>
              )}
            </div>
            <span className="text-sm font-bold text-primary">{progressoGeral}%</span>
          </div>
          <Progress value={progressoGeral} className="h-4" />
          <p className="text-xs text-muted-foreground mt-2">
            Obra concluída: {progressoGeral}%
            {totalPeso > 0 && totalPeso !== 100 && ' (cálculo baseado em média simples — ajuste os pesos para 100%)'}
            {pesoValido && ' (cálculo ponderado por peso)'}
          </p>
        </CardContent>
      </Card>

      {/* Indicadores: Planejado x Executado */}
      <Card className={`border ${statusObra.cls}`}>
        <CardContent className="pt-6">
          {!planejamentoConfigurado ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">⚪</p>
              <p className="font-bold text-base text-muted-foreground">Planejamento não configurado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastre atividades no Cronograma para habilitar o cálculo de progresso, prazo consumido, desvio e status.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{statusObra.dot}</span>
                  <div>
                    <p className={`font-bold text-lg ${statusObra.color}`}>{statusObra.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Executado: {progressoGeral}% • Prazo Consumido: {prazoConsumido}% • Desvio: {desvio > 0 ? '+' : ''}{desvio}%
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 md:gap-4 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Executado</p>
                    <p className="text-sm font-bold">{progressoGeral}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Prazo</p>
                    <p className="text-sm font-bold">{prazoConsumido}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Desvio</p>
                    <p className={`text-sm font-bold ${statusObra.color}`}>{desvio > 0 ? '+' : ''}{desvio}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Prazo {diasAditivos > 0 ? `(+${diasAditivos} aditivo)` : '(dias úteis)'}</p>
                    <p className="text-sm font-bold">{diasDecorridos}/{prazoEfetivo || '—'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-muted-foreground">Planejado</span>
                  <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${Math.min(prazoConsumido, 100)}%` }} />
                  </div>
                  <span className="w-10 text-right font-medium">{prazoConsumido}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-muted-foreground">Executado</span>
                  <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                    <div className={`h-full ${desvio > 5 ? 'bg-success' : desvio >= -5 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${Math.min(progressoGeral, 100)}%` }} />
                  </div>
                  <span className="w-10 text-right font-medium">{progressoGeral}%</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Aditivos */}
      {aditivos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Aditivos da Obra ({aditivos.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-28">Dias Adicionais</TableHead>
                    <TableHead className="w-32">Data Aprovação</TableHead>
                    <TableHead>Responsável</TableHead>
                    {canEdit && <TableHead className="w-20"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aditivos.map(ad => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{ad.descricao}</div>
                        {ad.justificativa && <div className="text-xs text-muted-foreground mt-0.5">{ad.justificativa}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">+{ad.dias_adicionais} dias</Badge></TableCell>
                      <TableCell className="text-xs">{ad.data_aprovacao ? format(parseISO(ad.data_aprovacao), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="text-xs">{ad.responsavel_aprovacao || '—'}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteAditivoId(ad.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities Table */}
      <Card>
        <CardHeader><CardTitle>Atividades</CardTitle></CardHeader>
        <CardContent>
          {atividades.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhuma atividade cadastrada. Clique em "Atividade" para começar.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead className="w-20">Peso</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="w-32">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atividades.map((a, i) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{a.nome_atividade}</span>
                          {(a.tipo_atividade || 'original') === 'aditivo' && (
                            <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300">ADITIVO</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{a.peso}%</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.data_inicio ? format(parseISO(a.data_inicio), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-sm">{a.data_fim ? format(parseISO(a.data_fim), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={a.percentual_concluido} className="h-2 w-16" />
                          <span className="text-xs font-medium">{a.percentual_concluido}%</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={statusColors[a.status]}>{statusLabels[a.status] || a.status}</Badge></TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => moveAtividade(a.id, 'up')} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => moveAtividade(a.id, 'down')} disabled={i === atividades.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="border-t-2">
                    <TableCell></TableCell>
                    <TableCell className="font-bold text-sm">TOTAL</TableCell>
                    <TableCell>
                      <Badge variant={pesoValido ? 'default' : 'destructive'} className="text-xs">
                        {totalPeso}%
                      </Badge>
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                    {canEdit && <TableCell></TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      {ganttData && (
        <Card>
          <CardHeader><CardTitle>Gráfico de Gantt</CardTitle></CardHeader>
          <CardContent>
            <div ref={ganttRef} className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Timeline header */}
                <div className="flex items-center border-b border-border pb-2 mb-2">
                  <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground">Atividade</div>
                  <div className="flex-1 flex justify-between text-xs text-muted-foreground">
                    <span>{format(ganttData.minDate, 'dd/MM', { locale: ptBR })}</span>
                    <span>{format(addDays(ganttData.minDate, Math.floor(ganttData.totalDays / 2)), 'dd/MM', { locale: ptBR })}</span>
                    <span>{format(ganttData.maxDate, 'dd/MM', { locale: ptBR })}</span>
                  </div>
                </div>
                {/* Bars */}
                {ganttData.validAtivs.map(a => {
                  const start = differenceInDays(parseISO(a.data_inicio!), ganttData.minDate);
                  const duration = Math.max(differenceInDays(parseISO(a.data_fim!), parseISO(a.data_inicio!)), 1);
                  const leftPct = (start / ganttData.totalDays) * 100;
                  const widthPct = Math.max((duration / ganttData.totalDays) * 100, 2);
                  return (
                    <div key={a.id} className="flex items-center mb-1.5">
                      <div className="w-48 shrink-0 text-xs truncate pr-2 text-foreground">
                        {a.nome_atividade}
                        <span className="text-muted-foreground ml-1">({a.peso}%)</span>
                      </div>
                      <div className="flex-1 relative h-7 bg-muted/30 rounded">
                        <div
                          className="absolute top-0 h-full bg-blue-100 dark:bg-blue-900/40 rounded"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        >
                          <div
                            className="h-full bg-primary rounded transition-all"
                            style={{ width: `${a.percentual_concluido}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
                            {a.percentual_concluido}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAtividade ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Atividade</Label>
                <Input value={formData.nome_atividade} onChange={e => setFormData(f => ({ ...f, nome_atividade: e.target.value }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.tipo_atividade} onValueChange={v => setFormData(f => ({ ...f, tipo_atividade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Contrato Original</SelectItem>
                    <SelectItem value="aditivo">Aditivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea rows={2} value={formData.descricao} onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input type="date" value={formData.data_inicio} onChange={e => setFormData(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={formData.data_fim} onChange={e => setFormData(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Progresso (%)</Label>
                <Input type="number" min={0} max={100} value={formData.percentual_concluido} onChange={e => setFormData(f => ({ ...f, percentual_concluido: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
              </div>
              <div>
                <Label>Peso (%) {!canEditPeso && <span className="text-muted-foreground text-xs">— somente admin</span>}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.peso}
                  onChange={e => setFormData(f => ({ ...f, peso: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                  disabled={!canEditPeso}
                />
                {(() => {
                  if (formData.tipo_atividade === 'aditivo') {
                    return <p className="text-xs text-amber-600 mt-1">Aditivos somam fora dos 100% do escopo original</p>;
                  }
                  const otherPeso = atividades
                    .filter(a => (a.tipo_atividade || 'original') === 'original')
                    .filter(a => !editingAtividade || a.id !== editingAtividade.id)
                    .reduce((s, a) => s + (a.peso || 0), 0);
                  const newTotal = otherPeso + formData.peso;
                  if (newTotal !== 100) {
                    return <p className="text-xs text-destructive mt-1">Total dos pesos originais: {newTotal}% (deve ser 100%)</p>;
                  }
                  return <p className="text-xs text-success mt-1">Total dos pesos: 100% ✓</p>;
                })()}
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea rows={2} value={formData.observacoes} onChange={e => setFormData(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aditivo Dialog */}
      <Dialog open={aditivoDialogOpen} onOpenChange={setAditivoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Aditivo de Prazo / Escopo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Descrição *</Label>
              <Input value={aditivoForm.descricao} onChange={e => setAditivoForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Recuperação estrutural adicional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dias Adicionais (úteis)</Label>
                <Input type="number" min={0} value={aditivoForm.dias_adicionais} onChange={e => setAditivoForm(f => ({ ...f, dias_adicionais: Math.max(0, Number(e.target.value)) }))} />
              </div>
              <div>
                <Label>Data de Aprovação</Label>
                <Input type="date" value={aditivoForm.data_aprovacao} onChange={e => setAditivoForm(f => ({ ...f, data_aprovacao: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Responsável pela Aprovação</Label>
              <Input value={aditivoForm.responsavel_aprovacao} onChange={e => setAditivoForm(f => ({ ...f, responsavel_aprovacao: e.target.value }))} />
            </div>
            <div>
              <Label>Justificativa</Label>
              <Textarea rows={3} value={aditivoForm.justificativa} onChange={e => setAditivoForm(f => ({ ...f, justificativa: e.target.value }))} />
            </div>
            <div>
              <Label>URL do Documento de Aprovação (opcional)</Label>
              <Input value={aditivoForm.documento_url} onChange={e => setAditivoForm(f => ({ ...f, documento_url: e.target.value }))} placeholder="https://..." />
            </div>
            <p className="text-xs text-muted-foreground">
              Após registrar o aditivo, crie as atividades correspondentes marcando-as como tipo <strong>Aditivo</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAditivoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAditivo}>Salvar Aditivo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Aditivo */}
      <AlertDialog open={!!deleteAditivoId} onOpenChange={() => setDeleteAditivoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Aditivo</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O prazo da obra será recalculado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAditivo}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta atividade?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
