import { useEffect, useState } from 'react';
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
import { ChevronDown, ChevronRight, Plus, DollarSign, TrendingDown, Pencil, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import NovaReceitaDialog from '@/components/NovaReceitaDialog';
import NovaDespesaDialog from '@/components/NovaDespesaDialog';

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
      // Refresh parcelas for this receita
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
    setEditReceitaOpen(true);
  };

  const handleEditReceita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReceitaItem) return;
    const { error } = await supabase.from('receitas').update({
      descricao: erDescricao,
      valor_total: parseFloat(erValor),
      observacoes: erObservacoes || null,
    }).eq('id', editReceitaItem.id);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Receita atualizada com sucesso!'); setEditReceitaOpen(false); fetchData(); }
  };

  // --- DELETE RECEITA ---
  const handleDeleteReceita = async () => {
    if (!deleteReceitaId) return;
    // Delete parcelas first
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
    setEdFormaPgto(d.forma_pagamento || '');
    setEditDespesaOpen(true);
  };

  const handleEditDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDespesaItem) return;
    const { error } = await supabase.from('despesas').update({
      valor: parseFloat(edValor),
      descricao: edDescricao,
      data: edData,
      tipo: edTipo,
      forma_pagamento: edFormaPgto || null,
    }).eq('id', editDespesaItem.id);
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
  const registrarPagamento = async (parcelaId: string, receitaId: string) => {
    const { error } = await supabase
      .from('parcelas')
      .update({ data_recebimento: new Date().toISOString().split('T')[0], status: 'recebido' })
      .eq('id', parcelaId);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Parcela marcada como recebida!');
      setParcelas(prev => { const copy = { ...prev }; delete copy[receitaId]; return copy; });
      if (expandedReceita === receitaId) {
        const { data } = await supabase.from('parcelas').select('*').eq('receita_id', receitaId).order('numero_parcela');
        setParcelas(prev => ({ ...prev, [receitaId]: data || [] }));
      }
      fetchData();
    }
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
      <h1 className="text-3xl font-display font-bold mb-6">Financeiro</h1>

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
                          <TableCell colSpan={canEdit ? 7 : 6} className="bg-muted/50 p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nº</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Vencimento</TableHead>
                                  <TableHead>Recebimento</TableHead>
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
                                      <TableCell>
                                        {st === 'recebido' && <Badge className="bg-success text-success-foreground">Recebido</Badge>}
                                        {st === 'atrasado' && <Badge variant="destructive">Atrasado</Badge>}
                                        {st === 'pendente' && <Badge variant="secondary">Pendente</Badge>}
                                      </TableCell>
                                      {canEdit && (
                                        <TableCell>
                                          <div className="flex items-center gap-1">
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
                      <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-muted-foreground">Nenhuma receita cadastrada</TableCell>
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
                    <TableHead>Forma Pgto</TableHead>
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
                      <TableCell className="capitalize">{d.forma_pagamento || '—'}</TableCell>
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
                      <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-muted-foreground">Nenhuma despesa cadastrada</TableCell>
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
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
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
                ? 'Esta parcela já foi marcada como recebida. Tem certeza que deseja excluí-la? Esta ação não pode ser desfeita.'
                : 'Tem certeza que deseja excluir esta parcela? Esta ação não pode ser desfeita.'}
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
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Receita */}
      <AlertDialog open={!!deleteReceitaId} onOpenChange={(open) => !open && setDeleteReceitaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Receita</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta receita e todas as parcelas vinculadas? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReceita} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Despesa */}
      <Dialog open={editDespesaOpen} onOpenChange={setEditDespesaOpen}>
        <DialogContent>
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
            <div><Label>Data</Label><Input type="date" value={edData} onChange={e => setEdData(e.target.value)} required /></div>
            <div><Label>Forma de Pagamento</Label><Input value={edFormaPgto} onChange={e => setEdFormaPgto(e.target.value)} placeholder="Ex: Pix, Cartão..." /></div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Despesa */}
      <AlertDialog open={!!deleteDespesaId} onOpenChange={(open) => !open && setDeleteDespesaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
