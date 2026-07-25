import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Wrench, Search, Pencil, Trash2, History, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Ferramenta {
  id: string;
  nome: string;
  numero_cadastro: string;
  tipo: string;
  status: string;
  obra_id: string | null;
  empresa_id: string | null;
  ultima_manutencao: string | null;
  voltagem: string | null;
  created_at: string;
}

interface Historico {
  id: string;
  tipo_evento: string;
  descricao: string;
  obra_id: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  disponivel: { label: 'Disponível', color: 'bg-blue-500' },
  em_uso: { label: 'Em Uso', color: 'bg-green-500' },
  manutencao: { label: 'Manutenção', color: 'bg-yellow-500' },
  inativo: { label: 'Inativo', color: 'bg-red-500' },
};

const TIPO_LABELS: Record<string, string> = {
  manual: 'Manual',
  eletrica: 'Elétrica',
  medicao: 'Medição',
};

export default function Ferramentas() {
  const { canEdit, user, empresaId } = useAuth();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [manutencaoOpen, setManutencaoOpen] = useState(false);
  const [manutencaoFerramentaId, setManutencaoFerramentaId] = useState<string | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [historicoFerramentaId, setHistoricoFerramentaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filtroObra, setFiltroObra] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busca, setBusca] = useState('');

  // Form fields
  const [nome, setNome] = useState('');
  const [numeroCadastro, setNumeroCadastro] = useState('');
  const [tipo, setTipo] = useState('manual');
  const [status, setStatus] = useState('disponivel');
  const [obraId, setObraId] = useState<string>('');
  const [voltagem, setVoltagem] = useState<string>('');

  // Manutenção fields
  const [manutData, setManutData] = useState(new Date().toISOString().split('T')[0]);
  const [manutValor, setManutValor] = useState('');
  const [manutLocal, setManutLocal] = useState('');
  const [manutAnexo, setManutAnexo] = useState<File | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: ferData }, { data: obrasData }] = await Promise.all([
      supabase.from('ferramentas').select('*').order('nome'),
      supabase.from('obras').select('id, nome, status').order('nome'),
    ]);
    setFerramentas((ferData as Ferramenta[]) || []);
    setObras(obrasData ? filterObras(obrasData) : []);
    setLoading(false);
  };

  useEffect(() => {
    if (!obrasFilterLoading) fetchData();
  }, [obrasFilterLoading]);

  const resetForm = () => {
    setNome(''); setNumeroCadastro(''); setTipo('manual'); setStatus('disponivel'); setObraId(''); setEditId(null);
  };

  const openEdit = (f: Ferramenta) => {
    setEditId(f.id);
    setNome(f.nome);
    setNumeroCadastro(f.numero_cadastro);
    setTipo(f.tipo);
    setStatus(f.status);
    setObraId(f.obra_id || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !numeroCadastro.trim()) {
      toast.error('Preencha nome e número de cadastro');
      return;
    }

    const realObraId = obraId && obraId !== 'nenhuma' ? obraId : null;

    const payload = {
      nome: nome.trim(),
      numero_cadastro: numeroCadastro.trim(),
      tipo,
      status,
      obra_id: realObraId,
    };

    if (editId) {
      // Check if obra changed to log history
      const old = ferramentas.find(f => f.id === editId);
      const { error } = await supabase.from('ferramentas').update(payload).eq('id', editId);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); return; }

      if (old && old.obra_id !== (obraId || null)) {
        const obraNome = obras.find(o => o.id === obraId)?.nome || 'Sem obra';
        await supabase.from('ferramentas_historico').insert({
          ferramenta_id: editId,
          tipo_evento: 'movimentacao',
          descricao: `Movida para: ${obraNome}`,
          obra_id: realObraId,
        });
      }
      if (old && old.status !== status) {
        await supabase.from('ferramentas_historico').insert({
          ferramenta_id: editId,
          tipo_evento: 'status',
          descricao: `Status alterado: ${STATUS_CONFIG[old.status]?.label} → ${STATUS_CONFIG[status]?.label}`,
          obra_id: realObraId,
        });
      }
      toast.success('Ferramenta atualizada');
    } else {
      const { error } = await supabase.from('ferramentas').insert(payload);
      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          toast.error('Número de cadastro já existe');
        } else {
          toast.error('Erro ao cadastrar: ' + error.message);
        }
        return;
      }
      toast.success('Ferramenta cadastrada');
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('ferramentas').delete().eq('id', deleteId);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Ferramenta excluída');
    setDeleteId(null);
    fetchData();
  };

  const openManutencao = (id: string) => {
    setManutencaoFerramentaId(id);
    setManutData(new Date().toISOString().split('T')[0]);
    setManutValor('');
    setManutLocal('');
    setManutAnexo(null);
    setManutencaoOpen(true);
  };

  const handleManutencao = async () => {
    if (saving) return;
    if (!manutencaoFerramentaId || !manutValor) {
      toast.error('Informe o valor da manutenção');
      return;
    }

    const ferramenta = ferramentas.find(f => f.id === manutencaoFerramentaId);
    if (!ferramenta) return;

    if (!empresaId) {
      toast.error('Empresa não identificada. Faça login novamente e tente de novo.');
      return;
    }

    if (!ferramenta.obra_id) {
      toast.error('Ferramenta não está vinculada a nenhuma obra. Vincule antes de registrar manutenção.');
      return;
    }

    const valorNumerico = Number(manutValor);
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      toast.error('Informe um valor de manutenção válido');
      return;
    }

    setSaving(true);
    try {
      let anexoUrl: string | null = null;
      if (manutAnexo) {
        const ext = manutAnexo.name.split('.').pop();
        const path = `manutencao/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('anexos').upload(path, manutAnexo);
        if (upErr) { toast.error('Erro ao enviar anexo'); return; }
        const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(path);
        anexoUrl = urlData.publicUrl;
      }

      const { data: manutencao, error } = await supabase
        .from('manutencao_ferramentas')
        .insert({
          descricao: `Manutenção - ${ferramenta.nome}`,
          valor: valorNumerico,
          data: manutData,
          loja: manutLocal || null,
          obra_id: ferramenta.obra_id,
          empresa_id: empresaId,
          numero_nota: null,
          forma_pagamento: null,
        } as any)
        .select('id')
        .single();

      if (error || !manutencao?.id) {
        toast.error('Erro ao registrar manutenção: ' + (error?.message || 'ID da manutenção não retornado'));
        return;
      }

      console.log('Criando despesa vinculada à manutenção:', manutencao.id);

      const { data: manutencaoVinculada, error: manutencaoLinkError } = await supabase
        .from('manutencao_ferramentas')
        .select('id, despesa_id')
        .eq('id', manutencao.id)
        .single();

      if (manutencaoLinkError || !manutencaoVinculada?.despesa_id) {
        toast.error('A manutenção foi criada, mas a despesa vinculada não foi confirmada.');
        return;
      }

      const { data: despesaVinculada, error: despesaLinkError } = await supabase
        .from('despesas')
        .select('id, manutencao_id')
        .eq('id', manutencaoVinculada.despesa_id)
        .single();

      if (despesaLinkError || despesaVinculada?.manutencao_id !== manutencao.id) {
        toast.error('A despesa foi criada sem vínculo válido com a manutenção.');
        return;
      }

      await Promise.all([
        supabase.from('ferramentas').update({ ultima_manutencao: manutData, status: 'manutencao' }).eq('id', manutencaoFerramentaId),
        supabase.from('ferramentas_historico').insert({
          ferramenta_id: manutencaoFerramentaId,
          tipo_evento: 'manutencao',
          descricao: `Manutenção: R$ ${valorNumerico.toFixed(2)} - ${manutLocal || 'Local não informado'}${anexoUrl ? ' (com anexo)' : ''}`,
          obra_id: ferramenta.obra_id,
          empresa_id: empresaId,
        }),
      ]);

      toast.success('Manutenção registrada e despesa vinculada com sucesso');
      setManutencaoOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const openHistorico = async (id: string) => {
    setHistoricoFerramentaId(id);
    const { data } = await supabase
      .from('ferramentas_historico')
      .select('*')
      .eq('ferramenta_id', id)
      .order('created_at', { ascending: false });
    setHistorico((data as Historico[]) || []);
    setHistoricoOpen(true);
  };

  // Filtering
  const filtered = ferramentas.filter(f => {
    if (filtroObra !== 'todas' && f.obra_id !== filtroObra) return false;
    if (filtroStatus !== 'todos' && f.status !== filtroStatus) return false;
    if (filtroTipo !== 'todos' && f.tipo !== filtroTipo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!f.nome.toLowerCase().includes(q) && !f.numero_cadastro.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const countByStatus = (s: string) => ferramentas.filter(f => f.status === s).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Ferramentas</h1>
          <p className="text-muted-foreground mt-1">Controle de equipamentos</p>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" /> Nova Ferramenta
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (
          <Card key={key}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{countByStatus(key)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou número..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroObra} onValueChange={setFiltroObra}>
              <SelectTrigger><SelectValue placeholder="Obra" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as obras</SelectItem>
                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhuma ferramenta encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nº Cadastro</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obra Atual</TableHead>
                    <TableHead>Última Manutenção</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => {
                    const obraNome = obras.find(o => o.id === f.obra_id)?.nome || '—';
                    const sc = STATUS_CONFIG[f.status] || { label: f.status, color: 'bg-muted' };
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell>{f.numero_cadastro}</TableCell>
                        <TableCell>{TIPO_LABELS[f.tipo] || f.tipo}</TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select value={f.status} onValueChange={async (newStatus) => {
                              const old = f.status;
                              if (newStatus === old) return;
                              const { error } = await supabase.from('ferramentas').update({ status: newStatus }).eq('id', f.id);
                              if (error) { toast.error('Erro ao alterar status'); return; }
                              await supabase.from('ferramentas_historico').insert({
                                ferramenta_id: f.id,
                                tipo_evento: 'status',
                                descricao: `Status alterado: ${STATUS_CONFIG[old]?.label} → ${STATUS_CONFIG[newStatus]?.label}`,
                                obra_id: f.obra_id,
                              });
                              toast.success('Status atualizado');
                              fetchData();
                            }}>
                              <SelectTrigger className="w-[140px] h-8">
                                <Badge variant="outline" className="gap-1.5 border-0">
                                  <span className={`h-2 w-2 rounded-full ${sc.color}`} />
                                  {sc.label}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>
                                    <span className="flex items-center gap-1.5">
                                      <span className={`h-2 w-2 rounded-full ${v.color}`} />
                                      {v.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${sc.color}`} />
                              {sc.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select value={f.obra_id || 'nenhuma'} onValueChange={async (newObraId) => {
                              const realNewObraId = newObraId === 'nenhuma' ? null : newObraId;
                              const oldObraId = f.obra_id;
                              if (realNewObraId === oldObraId) return;

                              const { error } = await supabase.from('ferramentas').update({
                                obra_id: realNewObraId,
                                ...(realNewObraId ? { status: 'em_uso' } : {}),
                              }).eq('id', f.id);
                              if (error) { toast.error('Erro ao alterar obra'); return; }

                              const oldObraNome = obras.find(o => o.id === oldObraId)?.nome || 'Sem obra';
                              const newObraNome = obras.find(o => o.id === realNewObraId)?.nome || 'Sem obra';
                              await supabase.from('ferramentas_historico').insert({
                                ferramenta_id: f.id,
                                tipo_evento: 'movimentacao',
                                descricao: `Movida de: ${oldObraNome} → ${newObraNome}`,
                                obra_id: realNewObraId,
                                empresa_id: empresaId,
                              });

                              if (realNewObraId && f.status !== 'em_uso') {
                                await supabase.from('ferramentas_historico').insert({
                                  ferramenta_id: f.id,
                                  tipo_evento: 'status',
                                  descricao: `Status alterado: ${STATUS_CONFIG[f.status]?.label} → Em Uso (automático)`,
                                  obra_id: realNewObraId,
                                  empresa_id: empresaId,
                                });
                              }

                              toast.success('Obra da ferramenta atualizada com sucesso');
                              fetchData();
                            }}>
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue>{obraNome}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nenhuma">Sem obra</SelectItem>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span>{obraNome}</span>
                          )}
                        </TableCell>
                        <TableCell>{f.ultima_manutencao ? new Date(f.ultima_manutencao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <>
                                <Button size="icon" variant="ghost" title="Registrar manutenção" onClick={() => openManutencao(f.id)}>
                                  <Wrench className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(f)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Excluir" onClick={() => setDeleteId(f.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" title="Histórico" onClick={() => openHistorico(f.id)}>
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Ferramenta' : 'Nova Ferramenta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Equipamento *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Furadeira Bosch" />
              </div>
              <div className="space-y-2">
                <Label>Nº Cadastro *</Label>
                <Input value={numeroCadastro} onChange={e => setNumeroCadastro(e.target.value)} placeholder="Ex: FER-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Obra Vinculada</Label>
              <Select value={obraId} onValueChange={setObraId}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma</SelectItem>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {editId ? 'Salvar Alterações' : 'Cadastrar Ferramenta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manutenção Dialog */}
      <Dialog open={manutencaoOpen} onOpenChange={setManutencaoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={manutData} onChange={e => setManutData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={manutValor} onChange={e => setManutValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Local / Empresa</Label>
              <Input value={manutLocal} onChange={e => setManutLocal(e.target.value)} placeholder="Nome da empresa ou loja" />
            </div>
            <div className="space-y-2">
              <Label>Anexo (Nota Fiscal)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setManutAnexo(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleManutencao} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Wrench className="h-4 w-4 mr-2" /> {saving ? 'Registrando...' : 'Registrar Manutenção'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Histórico Dialog */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico da Ferramenta</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3 pt-2">
            {historico.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum registro</p>
            ) : (
              historico.map(h => (
                <div key={h.id} className="flex items-start gap-3 border-b border-border pb-3">
                  <div className="mt-1">
                    {h.tipo_evento === 'manutencao' ? <Wrench className="h-4 w-4 text-yellow-500" /> :
                     h.tipo_evento === 'movimentacao' ? <History className="h-4 w-4 text-blue-500" /> :
                     <History className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{h.descricao}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ferramenta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todo o histórico será removido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
