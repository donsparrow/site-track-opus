import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronRight, Plus, DollarSign, TrendingDown, Pencil, Trash2, Check, Paperclip, Download, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import NovaReceitaDialog from '@/components/NovaReceitaDialog';
import NovaDespesaDialog from '@/components/NovaDespesaDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Financeiro() {
  const { canEdit, role } = useAuth();
  const [receitas, setReceitas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [expandedReceita, setExpandedReceita] = useState<string | null>(null);
  const [parcelas, setParcelas] = useState<Record<string, any[]>>({});
  const [receitaOpen, setReceitaOpen] = useState(false);
  const [despesaOpen, setDespesaOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [obras, setObras] = useState<any[]>([]);
  const [filterObra, setFilterObra] = useState('all');

  // Edit parcela
  const [editParcelaOpen, setEditParcelaOpen] = useState(false);
  const [editParcela, setEditParcela] = useState<any>(null);
  const [epValor, setEpValor] = useState('');
  const [epVencimento, setEpVencimento] = useState('');
  const [epFormaPgto, setEpFormaPgto] = useState('');

  // Delete parcela
  const [deleteParcelaId, setDeleteParcelaId] = useState<string | null>(null);
  const [deleteParcelaRecebido, setDeleteParcelaRecebido] = useState(false);
  const [deleteParcelaReceitaId, setDeleteParcelaReceitaId] = useState<string | null>(null);

  // Edit despesa
  const [editDespesaOpen, setEditDespesaOpen] = useState(false);
  const [editDespesaItem, setEditDespesaItem] = useState<any>(null);
  const [edValor, setEdValor] = useState('');
  const [edDescricao, setEdDescricao] = useState('');
  const [edData, setEdData] = useState('');
  const [edTipo, setEdTipo] = useState('');
  const [edFormaPgto, setEdFormaPgto] = useState('');
  const [edTipoPgto, setEdTipoPgto] = useState('avista');
  const [edDataVencimento, setEdDataVencimento] = useState('');
  const [edAnexoFile, setEdAnexoFile] = useState<File | null>(null);
  const edFileRef = useRef<HTMLInputElement>(null);

  // Delete despesa
  const [deleteDespesaId, setDeleteDespesaId] = useState<string | null>(null);

  // Delete receita
  const [deleteReceitaId, setDeleteReceitaId] = useState<string | null>(null);

  // Edit receita
  const [editReceitaOpen, setEditReceitaOpen] = useState(false);
  const [editReceitaItem, setEditReceitaItem] = useState<any>(null);
  const [erDescricao, setErDescricao] = useState('');
  const [erValor, setErValor] = useState('');
  const [erObservacoes, setErObservacoes] = useState('');
  const [erAnexoFile, setErAnexoFile] = useState<File | null>(null);
  const erFileRef = useRef<HTMLInputElement>(null);

  // Receber parcela
  const [receberOpen, setReceberOpen] = useState(false);
  const [receberParcelaId, setReceberParcelaId] = useState<string | null>(null);
  const [receberReceitaId, setReceberReceitaId] = useState<string | null>(null);
  const [receberFormaPgto, setReceberFormaPgto] = useState('pix');

  const isAdmin = role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    const { data: obrasData } = await supabase.from('obras').select('id, nome').order('nome');
    setObras(obrasData || []);

    let rQuery = supabase.from('receitas').select('*, obras(nome)').order('created_at', { ascending: false });
    let dQuery = supabase.from('despesas').select('*, obras(nome)').order('data', { ascending: false });

    if (filterObra !== 'all') {
      rQuery = rQuery.eq('obra_id', filterObra);
      dQuery = dQuery.eq('obra_id', filterObra);
    }

    const { data: r } = await rQuery;
    setReceitas(r || []);

    const { data: d } = await dQuery;
    setDespesas(d || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterObra]);

  const toggleReceita = async (receitaId: string) => {
    if (expandedReceita === receitaId) { setExpandedReceita(null); return; }
    if (!parcelas[receitaId]) {
      const { data } = await supabase.from('parcelas').select('*').eq('receita_id', receitaId).order('numero_parcela');
      setParcelas(prev => ({ ...prev, [receitaId]: data || [] }));
    }
    setExpandedReceita(receitaId);
  };

  // --- EDIT PARCELA ---
  const openEditParcela = (p: any) => {
    setEditParcela(p);
    setEpValor(String(p.valor));
    setEpVencimento(p.data_vencimento);
    setEpFormaPgto(p.forma_pagamento || 'pix');
    setEditParcelaOpen(true);
  };

  const handleEditParcela = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParcela) return;
    const { error } = await supabase.from('parcelas').update({
      valor: parseFloat(epValor),
      data_vencimento: epVencimento,
      forma_pagamento: epFormaPgto || null,
    }).eq('id', editParcela.id);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Parcela atualizada com sucesso!');
      setEditParcelaOpen(false);
      setParcelas(prev => { const copy = { ...prev }; delete copy[editParcela.receita_id]; return copy; });
      if (expandedReceita === editParcela.receita_id) {
        const { data } = await supabase.from('parcelas').select('*').eq('receita_id', editParcela.receita_id).order('numero_parcela');
        setParcelas(prev => ({ ...prev, [editParcela.receita_id]: data || [] }));
      }
      fetchData();
    }
  };

  // --- DELETE PARCELA ---
  const confirmDeleteParcela = (p: any) => {
    setDeleteParcelaId(p.id);
    setDeleteParcelaReceitaId(p.receita_id);
    setDeleteParcelaRecebido(!!p.data_recebimento);
  };

  const handleDeleteParcela = async () => {
    if (!deleteParcelaId) return;
    const { error } = await supabase.from('parcelas').delete().eq('id', deleteParcelaId);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Parcela excluída com sucesso!');
      if (deleteParcelaReceitaId) {
        setParcelas(prev => { const copy = { ...prev }; delete copy[deleteParcelaReceitaId]; return copy; });
        if (expandedReceita === deleteParcelaReceitaId) {
          const { data } = await supabase.from('parcelas').select('*').eq('receita_id', deleteParcelaReceitaId).order('numero_parcela');
          setParcelas(prev => ({ ...prev, [deleteParcelaReceitaId!]: data || [] }));
        }
      }
      fetchData();
    }
    setDeleteParcelaId(null);
  };

  // --- EDIT RECEITA ---
  const openEditReceita = (r: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditReceitaItem(r);
    setErDescricao(r.descricao);
    setErValor(String(r.valor_total));
    setErObservacoes(r.observacoes || '');
    setErAnexoFile(null);
    setEditReceitaOpen(true);
  };

  const handleEditReceita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReceitaItem) return;

    let anexoUrl = editReceitaItem.anexo;
    if (erAnexoFile) {
      const ext = erAnexoFile.name.split('.').pop();
      const path = `receitas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('anexos').upload(path, erAnexoFile);
      if (upErr) { toast.error('Erro ao enviar arquivo: ' + upErr.message); return; }
      const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(path);
      anexoUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('receitas').update({
      descricao: erDescricao,
      valor_total: parseFloat(erValor),
      observacoes: erObservacoes || null,
      anexo: anexoUrl,
    } as any).eq('id', editReceitaItem.id);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Receita atualizada com sucesso!'); setEditReceitaOpen(false); fetchData(); }
  };

  // --- DELETE RECEITA ---
  const handleDeleteReceita = async () => {
    if (!deleteReceitaId) return;
    await supabase.from('parcelas').delete().eq('receita_id', deleteReceitaId);
    const { error } = await supabase.from('receitas').delete().eq('id', deleteReceitaId);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Receita e parcelas excluídas com sucesso!');
      setParcelas(prev => { const copy = { ...prev }; delete copy[deleteReceitaId]; return copy; });
      fetchData();
    }
    setDeleteReceitaId(null);
  };

  // --- EDIT DESPESA ---
  const openEditDespesa = (d: any) => {
    setEditDespesaItem(d);
    setEdValor(String(d.valor));
    setEdDescricao(d.descricao);
    setEdData(d.data);
    setEdTipo(d.tipo);
    setEdFormaPgto(d.forma_pagamento || 'pix');
    setEdTipoPgto(d.tipo_pagamento || 'avista');
    setEdDataVencimento(d.data_vencimento || '');
    setEdAnexoFile(null);
    setEditDespesaOpen(true);
  };

  const handleEditDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDespesaItem) return;

    let anexoUrl = editDespesaItem.anexo;
    if (edAnexoFile) {
      const ext = edAnexoFile.name.split('.').pop();
      const path = `despesas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('anexos').upload(path, edAnexoFile);
      if (upErr) { toast.error('Erro ao enviar arquivo: ' + upErr.message); return; }
      const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(path);
      anexoUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('despesas').update({
      valor: parseFloat(edValor),
      descricao: edDescricao,
      data: edData,
      tipo: edTipo,
      forma_pagamento: edFormaPgto || null,
      tipo_pagamento: edTipoPgto,
      data_vencimento: edTipoPgto === 'prazo' ? edDataVencimento : null,
      anexo: anexoUrl,
    } as any).eq('id', editDespesaItem.id);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Despesa atualizada com sucesso!'); setEditDespesaOpen(false); fetchData(); }
  };

  // --- DELETE DESPESA ---
  const handleDeleteDespesa = async () => {
    if (!deleteDespesaId) return;
    const { error } = await supabase.from('despesas').delete().eq('id', deleteDespesaId);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Despesa excluída com sucesso!'); fetchData(); }
    setDeleteDespesaId(null);
  };

  // --- RECEBER PARCELA ---
  const openReceber = (parcelaId: string, receitaId: string) => {
    setReceberParcelaId(parcelaId);
    setReceberReceitaId(receitaId);
    setReceberFormaPgto('pix');
    setReceberOpen(true);
  };

  const handleReceber = async () => {
    if (!receberParcelaId || !receberReceitaId) return;
    const { error } = await supabase
      .from('parcelas')
      .update({ data_recebimento: new Date().toISOString().split('T')[0], status: 'recebido', forma_pagamento: receberFormaPgto })
      .eq('id', receberParcelaId);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Parcela marcada como recebida!');
      setReceberOpen(false);
      setParcelas(prev => { const copy = { ...prev }; delete copy[receberReceitaId!]; return copy; });
      if (expandedReceita === receberReceitaId) {
        const { data } = await supabase.from('parcelas').select('*').eq('receita_id', receberReceitaId!).order('numero_parcela');
        setParcelas(prev => ({ ...prev, [receberReceitaId!]: data || [] }));
      }
      fetchData();
    }
  };

  // --- DOWNLOAD ---
  const handleDownload = (url: string, nome?: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = nome || 'anexo';
    a.target = '_blank';
    a.click();
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/');
      const raw = parts[parts.length - 1];
      // Remove timestamp prefix
      return raw.replace(/^\d+_[a-z0-9]+\./, 'arquivo.');
    } catch { return 'arquivo'; }
  };

  // --- NOTAS FISCAIS REPORT ---
  const generateNotasReport = () => {
    const items: any[] = [];
    receitas.forEach(r => {
      if (r.anexo) {
        items.push({ tipo: 'Receita', obra: r.obras?.nome || '—', descricao: r.descricao, valor: Number(r.valor_total), data: r.created_at?.split('T')[0] || '', arquivo: getFileName(r.anexo), url: r.anexo });
      }
    });
    despesas.forEach(d => {
      if (d.anexo) {
        items.push({ tipo: 'Despesa', obra: d.obras?.nome || '—', descricao: d.descricao, valor: Number(d.valor), data: d.data, arquivo: getFileName(d.anexo), url: d.anexo });
      }
    });

    if (items.length === 0) {
      toast.info('Nenhum documento anexado encontrado.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Notas Fiscais', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Tipo', 'Obra', 'Descrição', 'Valor', 'Data', 'Arquivo']],
      body: items.map(i => [
        i.tipo,
        i.obra,
        i.descricao,
        fmt(i.valor),
        i.data ? new Date(i.data + 'T00:00:00').toLocaleDateString('pt-BR') : '',
        i.arquivo,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save('relatorio_notas_fiscais.pdf');
    toast.success('Relatório gerado com sucesso!');
  };

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const tipoLabels: Record<string, string> = {
    material: 'Material', mao_obra: 'Mão de obra', ferramenta: 'Ferramenta', manutencao: 'Manutenção', outros: 'Outros'
  };

  const totalReceitas = receitas.reduce((s, r) => s + Number(r.valor_total), 0);
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">Financeiro</h1>
        <Button variant="outline" size="sm" onClick={generateNotasReport}>
          <FileText className="h-4 w-4 mr-1" /> Relatório Notas Fiscais
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Receitas</p>
                <p className="text-2xl font-display font-bold text-success">{fmt(totalReceitas)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Despesas</p>
                <p className="text-2xl font-display font-bold text-destructive">{fmt(totalDespesas)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-display font-bold ${saldo < 0 ? 'text-destructive' : 'text-success'}`}>{fmt(saldo)}</p>
              </div>
              <DollarSign className={`h-8 w-8 ${saldo < 0 ? 'text-destructive' : 'text-success'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6 max-w-xs">
        <Select value={filterObra} onValueChange={setFilterObra}>
          <SelectTrigger><SelectValue placeholder="Filtrar por obra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="receitas">
        <TabsList className="mb-6">
          <TabsTrigger value="receitas">Receitas ({receitas.length})</TabsTrigger>
          <TabsTrigger value="despesas">Despesas ({despesas.length})</TabsTrigger>
          <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-semibold">Receitas</h2>
            {canEdit && (
              <Button onClick={() => setReceitaOpen(true)} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Nova Receita
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Anexo</TableHead>
                    {canEdit && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitas.map((r) => (
                    <>
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => toggleReceita(r.id)}>
                        <TableCell>
                          {expandedReceita === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{r.descricao}</TableCell>
                        <TableCell>{r.obras?.nome || '—'}</TableCell>
                        <TableCell className="text-success font-medium">{fmt(Number(r.valor_total))}</TableCell>
                        <TableCell className="capitalize">{r.forma_pagamento}</TableCell>
                        <TableCell>{r.numero_parcelas}x</TableCell>
                        <TableCell>
                          {r.anexo ? (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDownload(r.anexo); }}>
                              <Download className="h-4 w-4 text-primary" />
                            </Button>
                          ) : '—'}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => openEditReceita(r, e)} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {isAdmin && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteReceitaId(r.id); }} title="Excluir">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expandedReceita === r.id && parcelas[r.id] && (
                        <TableRow key={`${r.id}-parcelas`}>
                          <TableCell colSpan={canEdit ? 8 : 7} className="bg-muted/50 p-4">
                            <Table>
                              <TableHeader>
                                 <TableRow>
                                   <TableHead>Nº</TableHead>
                                   <TableHead>Valor</TableHead>
                                   <TableHead>Vencimento</TableHead>
                                   <TableHead>Recebimento</TableHead>
                                   <TableHead>Forma Pgto</TableHead>
                                   <TableHead>Status</TableHead>
                                   {canEdit && <TableHead>Ações</TableHead>}
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                {parcelas[r.id].map((p: any) => {
                                  const today = new Date().toISOString().split('T')[0];
                                  const st = p.data_recebimento ? 'recebido' : (p.data_vencimento < today ? 'atrasado' : 'pendente');
                                  return (
                                    <TableRow key={p.id} className={st === 'atrasado' ? 'bg-destructive/5' : ''}>
                                      <TableCell>{p.numero_parcela}</TableCell>
                                      <TableCell>{fmt(Number(p.valor))}</TableCell>
                                      <TableCell>{new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                                      <TableCell>{p.data_recebimento ? new Date(p.data_recebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                                      <TableCell className="capitalize">{p.forma_pagamento || '—'}</TableCell>
                                      <TableCell>
                                        {st === 'recebido' && <Badge className="bg-success text-success-foreground">Recebido</Badge>}
                                        {st === 'atrasado' && <Badge variant="destructive">Atrasado</Badge>}
                                        {st === 'pendente' && <Badge variant="secondary">Pendente</Badge>}
                                      </TableCell>
                                      {canEdit && (
                                        <TableCell>
                                          <div className="flex items-center gap-1">
                                            {st !== 'recebido' && (
                                               <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openReceber(p.id, r.id)}>
                                                 <Check className="h-3 w-3 mr-1" /> Receber
                                               </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditParcela(p)} title="Editar">
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {isAdmin && (
                                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => confirmDeleteParcela(p)} title="Excluir">
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                  {receitas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">Nenhuma receita cadastrada</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-semibold">Despesas</h2>
            {canEdit && (
              <Button onClick={() => setDespesaOpen(true)} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Nova Despesa
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pgto</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Anexo</TableHead>
                    {canEdit && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.descricao}</TableCell>
                      <TableCell>{d.obras?.nome || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{tipoLabels[d.tipo] || d.tipo}</Badge></TableCell>
                      <TableCell className="text-destructive font-medium">{fmt(Number(d.valor))}</TableCell>
                      <TableCell>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={d.tipo_pagamento === 'prazo' ? 'outline' : 'secondary'}>
                          {d.tipo_pagamento === 'prazo' ? 'A Prazo' : 'À Vista'}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{d.forma_pagamento || '—'}</TableCell>
                      <TableCell>
                        {d.anexo ? (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(d.anexo)}>
                            <Download className="h-4 w-4 text-primary" />
                          </Button>
                        ) : '—'}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDespesa(d)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDespesaId(d.id)} title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {despesas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 10 : 9} className="text-center py-8 text-muted-foreground">Nenhuma despesa cadastrada</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTAS FISCAIS TAB */}
        <TabsContent value="notas">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-semibold">Documentos Anexados</h2>
            <Button variant="outline" size="sm" onClick={generateNotasReport}>
              <FileText className="h-4 w-4 mr-1" /> Exportar PDF
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ...receitas.filter(r => r.anexo).map(r => ({
                      id: r.id, tipo: 'Receita', obra: r.obras?.nome || '—', descricao: r.descricao,
                      valor: Number(r.valor_total), data: r.created_at?.split('T')[0] || '', url: r.anexo,
                    })),
                    ...despesas.filter(d => d.anexo).map(d => ({
                      id: d.id, tipo: 'Despesa', obra: d.obras?.nome || '—', descricao: d.descricao,
                      valor: Number(d.valor), data: d.data, url: d.anexo,
                    })),
                  ].map((item) => (
                    <TableRow key={`${item.tipo}-${item.id}`}>
                      <TableCell>
                        <Badge variant={item.tipo === 'Receita' ? 'default' : 'secondary'}>{item.tipo}</Badge>
                      </TableCell>
                      <TableCell>{item.obra}</TableCell>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell>{fmt(item.valor)}</TableCell>
                      <TableCell>{item.data ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{getFileName(item.url)}</span>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(item.url)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {receitas.filter(r => r.anexo).length === 0 && despesas.filter(d => d.anexo).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum documento anexado encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}

      <NovaReceitaDialog open={receitaOpen} onOpenChange={setReceitaOpen} onCreated={fetchData} />
      <NovaDespesaDialog open={despesaOpen} onOpenChange={setDespesaOpen} onCreated={fetchData} />

      {/* Edit Parcela */}
      <Dialog open={editParcelaOpen} onOpenChange={setEditParcelaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Editar Parcela</DialogTitle></DialogHeader>
          <form onSubmit={handleEditParcela} className="space-y-4">
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0" value={epValor} onChange={e => setEpValor(e.target.value)} required /></div>
            <div><Label>Data de Vencimento</Label><Input type="date" value={epVencimento} onChange={e => setEpVencimento(e.target.value)} required /></div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={epFormaPgto} onValueChange={setEpFormaPgto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="pix">PIX</SelectItem>
                   <SelectItem value="boleto">Boleto</SelectItem>
                   <SelectItem value="transferencia">Transferência</SelectItem>
                   <SelectItem value="cartao">Cartão</SelectItem>
                   <SelectItem value="dinheiro">Dinheiro</SelectItem>
                   <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Parcela */}
      <AlertDialog open={!!deleteParcelaId} onOpenChange={(open) => !open && setDeleteParcelaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Parcela</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteParcelaRecebido
                ? 'Esta parcela já foi marcada como recebida. Tem certeza que deseja excluí-la?'
                : 'Tem certeza que deseja excluir esta parcela?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteParcela} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Receita */}
      <Dialog open={editReceitaOpen} onOpenChange={setEditReceitaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Editar Receita</DialogTitle></DialogHeader>
          <form onSubmit={handleEditReceita} className="space-y-4">
            <div><Label>Descrição</Label><Input value={erDescricao} onChange={e => setErDescricao(e.target.value)} required /></div>
            <div><Label>Valor Total (R$)</Label><Input type="number" step="0.01" min="0" value={erValor} onChange={e => setErValor(e.target.value)} required /></div>
            <div><Label>Observações</Label><Input value={erObservacoes} onChange={e => setErObservacoes(e.target.value)} /></div>
            <div>
              <Label>Anexo (PDF, JPG, PNG)</Label>
              <input ref={erFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setErAnexoFile(e.target.files?.[0] || null)} />
              <div className="flex items-center gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => erFileRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-1" /> {editReceitaItem?.anexo ? 'Substituir' : 'Anexar'}
                </Button>
                {erAnexoFile && <span className="text-sm text-muted-foreground flex items-center gap-1">{erAnexoFile.name} <button type="button" onClick={() => setErAnexoFile(null)}><X className="h-3 w-3" /></button></span>}
                {!erAnexoFile && editReceitaItem?.anexo && <span className="text-sm text-muted-foreground">📎 Anexo existente</span>}
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Receita */}
      <AlertDialog open={!!deleteReceitaId} onOpenChange={(open) => !open && setDeleteReceitaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Receita</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta receita e todas as parcelas vinculadas?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReceita} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Despesa */}
      <Dialog open={editDespesaOpen} onOpenChange={setEditDespesaOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Editar Despesa</DialogTitle></DialogHeader>
          <form onSubmit={handleEditDespesa} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={edTipo} onValueChange={setEdTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="mao_obra">Mão de Obra</SelectItem>
                  <SelectItem value="ferramenta">Ferramenta</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={edDescricao} onChange={e => setEdDescricao(e.target.value)} required /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0" value={edValor} onChange={e => setEdValor(e.target.value)} required /></div>
            <div><Label>Data da Compra</Label><Input type="date" value={edData} onChange={e => setEdData(e.target.value)} required /></div>
            <div>
              <Label>Tipo de Pagamento</Label>
              <Select value={edTipoPgto} onValueChange={setEdTipoPgto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avista">À Vista</SelectItem>
                  <SelectItem value="prazo">A Prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {edTipoPgto === 'prazo' && (
              <div><Label>Data de Vencimento</Label><Input type="date" value={edDataVencimento} onChange={e => setEdDataVencimento(e.target.value)} required /></div>
            )}
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={edFormaPgto || 'pix'} onValueChange={setEdFormaPgto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Anexo (PDF, JPG, PNG)</Label>
              <input ref={edFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setEdAnexoFile(e.target.files?.[0] || null)} />
              <div className="flex items-center gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => edFileRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-1" /> {editDespesaItem?.anexo ? 'Substituir' : 'Anexar'}
                </Button>
                {edAnexoFile && <span className="text-sm text-muted-foreground flex items-center gap-1">{edAnexoFile.name} <button type="button" onClick={() => setEdAnexoFile(null)}><X className="h-3 w-3" /></button></span>}
                {!edAnexoFile && editDespesaItem?.anexo && <span className="text-sm text-muted-foreground">📎 Anexo existente</span>}
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receber Parcela */}
      <Dialog open={receberOpen} onOpenChange={setReceberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Receber Parcela</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={receberFormaPgto} onValueChange={setReceberFormaPgto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">A data de recebimento será preenchida com a data de hoje.</p>
            <Button onClick={handleReceber} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Confirmar Recebimento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Despesa */}
      <AlertDialog open={!!deleteDespesaId} onOpenChange={(open) => !open && setDeleteDespesaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta despesa?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDespesa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
