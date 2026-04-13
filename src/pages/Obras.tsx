import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HardHat, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import NovaObraDialog from '@/components/NovaObraDialog';

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

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  andamento: 'Em andamento',
  concluida: 'Concluída',
};

export default function Obras() {
  const { role, isSuperAdmin, isAdmin } = useAuth();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  const { pode } = usePermissions();
  const [obras, setObras] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [novaObraOpen, setNovaObraOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editObra, setEditObra] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const canManage = isSuperAdmin || isAdmin;
  const canCreate = pode('dashboard', 'criar') || canManage;
  const canView = true;

  const fetchObras = async () => {
    const { data } = await supabase
      .from('obras')
      .select('*, clientes(nome)')
      .order('created_at', { ascending: false });
    setObras(filterObras((data || []) as any[]));
  };

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome').order('nome');
    setClientes(data || []);
  };

  useEffect(() => {
    if (!obrasFilterLoading) {
      fetchObras();
      fetchClientes();
    }
  }, [obrasFilterLoading]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta obra?')) return;
    const { error } = await supabase.from('obras').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir: ' + error.message);
    else { toast.success('Obra excluída!'); fetchObras(); }
  };

  const openEdit = (obra: any) => {
    setEditObra({
      ...obra,
      prazo_contratual_dias: obra.prazo_contratual_dias || 0,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editObra) return;
    setLoading(true);
    const { error } = await supabase.from('obras').update({
      nome: editObra.nome,
      endereco: editObra.endereco || null,
      responsavel_tecnico: editObra.responsavel_tecnico || null,
      crea_cau: editObra.crea_cau || null,
      cliente_id: editObra.cliente_id || null,
      data_inicio: editObra.data_inicio || null,
      data_fim_prevista: editObra.data_fim_prevista || null,
      prazo_contratual_dias: editObra.prazo_contratual_dias || 0,
      status: editObra.status,
    }).eq('id', editObra.id);
    setLoading(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else { toast.success('Obra atualizada!'); setEditOpen(false); fetchObras(); }
  };

  const handleEditDateChange = (field: 'data_inicio' | 'data_fim_prevista', value: string) => {
    const updated = { ...editObra, [field]: value };
    if (updated.data_inicio && updated.data_fim_prevista) {
      updated.prazo_contratual_dias = calcBusinessDays(updated.data_inicio, updated.data_fim_prevista);
    }
    setEditObra(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Obras</h1>
        {canCreate && (
          <Button onClick={() => setNovaObraOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" /> Nova Obra
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Prazo (dias úteis)</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {obras.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center text-muted-foreground py-8">Nenhuma obra cadastrada</TableCell></TableRow>
              )}
              {obras.map(obra => (
                <TableRow key={obra.id}>
                  <TableCell className="font-medium">{obra.nome}</TableCell>
                  <TableCell>{obra.clientes?.nome || '—'}</TableCell>
                  <TableCell>{obra.endereco || '—'}</TableCell>
                  <TableCell>{obra.data_inicio || '—'}</TableCell>
                  <TableCell>{obra.data_fim_prevista || '—'}</TableCell>
                  <TableCell>{obra.prazo_contratual_dias || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabels[obra.status] || obra.status}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(obra)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(obra.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NovaObraDialog open={novaObraOpen} onOpenChange={setNovaObraOpen} onCreated={fetchObras} />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Editar Obra</DialogTitle>
          </DialogHeader>
          {editObra && (
            <div className="space-y-4">
              <div>
                <Label>Nome da Obra *</Label>
                <Input value={editObra.nome} onChange={e => setEditObra({ ...editObra, nome: e.target.value })} required />
              </div>
              <div>
                <Label>Endereço *</Label>
                <Input value={editObra.endereco || ''} onChange={e => setEditObra({ ...editObra, endereco: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Responsável Técnico *</Label>
                  <Input value={editObra.responsavel_tecnico || ''} onChange={e => setEditObra({ ...editObra, responsavel_tecnico: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editObra.status} onValueChange={v => setEditObra({ ...editObra, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejamento">Planejamento</SelectItem>
                      <SelectItem value="andamento">Em andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={editObra.cliente_id || ''} onValueChange={v => setEditObra({ ...editObra, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início *</Label>
                  <Input type="date" value={editObra.data_inicio || ''} onChange={e => handleEditDateChange('data_inicio', e.target.value)} />
                </div>
                <div>
                  <Label>Data de Término *</Label>
                  <Input type="date" value={editObra.data_fim_prevista || ''} onChange={e => handleEditDateChange('data_fim_prevista', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Prazo Contratual (dias úteis)</Label>
                <Input
                  type="number"
                  min={1}
                  value={editObra.prazo_contratual_dias || ''}
                  onChange={e => setEditObra({ ...editObra, prazo_contratual_dias: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente pelas datas, mas pode ser ajustado manualmente.</p>
              </div>
              <Button onClick={handleEditSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
