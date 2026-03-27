import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Atividade {
  id: string;
  cronograma_id: string;
  ordem: number;
  nome_atividade: string;
  data_inicio: string | null;
  data_fim: string | null;
  percentual_concluido: number;
  status: string;
}

interface Cronograma {
  id: string;
  obra_id: string;
  data_inicio: string | null;
  data_fim_prevista: string | null;
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
  const { canEdit } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const obraIdParam = searchParams.get('obra');

  const [obraId, setObraId] = useState(obraIdParam || '');
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [formData, setFormData] = useState({ nome_atividade: '', data_inicio: '', data_fim: '', percentual_concluido: 0, status: 'nao_iniciado' });

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const ganttRef = useRef<HTMLDivElement>(null);

  const obraNome = obras.find(o => o.id === obraId)?.nome || '';

  // Fetch obras
  useEffect(() => {
    supabase.from('obras').select('id, nome').order('nome').then(({ data }) => {
      setObras((data || []) as { id: string; nome: string }[]);
    });
  }, []);

  useEffect(() => {
    if (obraIdParam && obraIdParam !== obraId) setObraId(obraIdParam);
  }, [obraIdParam]);

  const loadCronograma = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    // Get or create cronograma
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
    setLoading(false);
  }, [obraId, canEdit]);

  useEffect(() => { loadCronograma(); }, [loadCronograma]);

  const progressoGeral = atividades.length > 0
    ? Math.round(atividades.reduce((sum, a) => sum + a.percentual_concluido, 0) / atividades.length)
    : 0;

  // CRUD
  const openNew = () => {
    setEditingAtividade(null);
    setFormData({ nome_atividade: '', data_inicio: '', data_fim: '', percentual_concluido: 0, status: 'nao_iniciado' });
    setDialogOpen(true);
  };
  const openEdit = (a: Atividade) => {
    setEditingAtividade(a);
    setFormData({
      nome_atividade: a.nome_atividade,
      data_inicio: a.data_inicio || '',
      data_fim: a.data_fim || '',
      percentual_concluido: a.percentual_concluido,
      status: a.status,
    });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!formData.nome_atividade || !cronograma) return;
    if (editingAtividade) {
      await supabase.from('cronograma_atividades').update({
        nome_atividade: formData.nome_atividade,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        percentual_concluido: formData.percentual_concluido,
        status: formData.status,
      } as any).eq('id', editingAtividade.id);
      toast.success('Atividade atualizada');
    } else {
      const maxOrdem = atividades.length > 0 ? Math.max(...atividades.map(a => a.ordem)) : 0;
      await supabase.from('cronograma_atividades').insert({
        cronograma_id: cronograma.id,
        nome_atividade: formData.nome_atividade,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        percentual_concluido: formData.percentual_concluido,
        status: formData.status,
        ordem: maxOrdem + 1,
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
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text(`Cronograma - ${obraNome}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, 14, 28);
    doc.text(`Progresso Geral: ${progressoGeral}%`, 14, 34);

    // Progress bar visual
    const barX = 14, barY = 38, barW = pageWidth - 28, barH = 6;
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(barX, barY, barW, barH, 2, 2, 'F');
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(barX, barY, barW * (progressoGeral / 100), barH, 2, 2, 'F');

    // Activities table
    autoTable(doc, {
      startY: 50,
      head: [['#', 'Atividade', 'Início', 'Fim', 'Progresso', 'Status']],
      body: atividades.map((a, i) => [
        i + 1,
        a.nome_atividade,
        a.data_inicio ? format(parseISO(a.data_inicio), 'dd/MM/yyyy') : '-',
        a.data_fim ? format(parseISO(a.data_fim), 'dd/MM/yyyy') : '-',
        `${a.percentual_concluido}%`,
        statusLabels[a.status] || a.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    // Simple Gantt in PDF
    if (ganttData) {
      const gY = finalY + 10;
      if (gY < doc.internal.pageSize.getHeight() - 40) {
        doc.setFontSize(12);
        doc.text('Gráfico de Gantt', 14, gY);
        const chartX = 14, chartW = pageWidth - 28;
        const rowH = 8;
        ganttData.validAtivs.forEach((a, i) => {
          const y = gY + 6 + i * (rowH + 2);
          if (y > doc.internal.pageSize.getHeight() - 20) return;
          const start = differenceInDays(parseISO(a.data_inicio!), ganttData.minDate);
          const duration = Math.max(differenceInDays(parseISO(a.data_fim!), parseISO(a.data_inicio!)), 1);
          const barStart = chartX + (start / ganttData.totalDays) * chartW;
          const barWidth = Math.max((duration / ganttData.totalDays) * chartW, 4);

          doc.setFillColor(219, 234, 254);
          doc.roundedRect(barStart, y, barWidth, rowH, 1, 1, 'F');
          const fillW = barWidth * (a.percentual_concluido / 100);
          if (fillW > 0) {
            doc.setFillColor(59, 130, 246);
            doc.roundedRect(barStart, y, fillW, rowH, 1, 1, 'F');
          }
          doc.setFontSize(7);
          doc.setTextColor(0);
          doc.text(a.nome_atividade, barStart + 2, y + 5.5);
        });
      }
    }

    const nome = obraNome.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    doc.save(`cronograma_${nome}.pdf`);
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
          {canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Atividade</Button>}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progresso da Obra</span>
            <span className="text-sm font-bold text-primary">{progressoGeral}%</span>
          </div>
          <Progress value={progressoGeral} className="h-4" />
        </CardContent>
      </Card>

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
                      <TableCell className="font-medium">{a.nome_atividade}</TableCell>
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
                      <div className="w-48 shrink-0 text-xs truncate pr-2 text-foreground">{a.nome_atividade}</div>
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
            <div>
              <Label>Nome da Atividade</Label>
              <Input value={formData.nome_atividade} onChange={e => setFormData(f => ({ ...f, nome_atividade: e.target.value }))} />
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
            <div>
              <Label>Progresso (%)</Label>
              <Input type="number" min={0} max={100} value={formData.percentual_concluido} onChange={e => setFormData(f => ({ ...f, percentual_concluido: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
