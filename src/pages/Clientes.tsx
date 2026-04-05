import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Clientes() {
  const { isAdmin } = useAuth();
  const { pode } = usePermissions();
  const canCreate = pode('clientes', 'criar');
  const canEditCliente = pode('clientes', 'editar');
  const canDelete = pode('clientes', 'excluir');
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [administradora, setAdministradora] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteNome, setDeleteNome] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nome');
    setClientes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const resetForm = () => {
    setNome(''); setCpfCnpj(''); setEndereco(''); setAdministradora(''); setTelefone(''); setEmail('');
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setNome(c.nome || '');
    setCpfCnpj(c.cpf_cnpj || '');
    setEndereco(c.endereco || '');
    setAdministradora(c.administradora || '');
    setTelefone(c.telefone || '');
    setEmail(c.email || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);

    const payload = {
      nome: nome.trim(),
      cpf_cnpj: cpfCnpj || null,
      endereco: endereco || null,
      administradora: administradora || null,
      telefone: telefone || null,
      email: email || null,
    };

    if (editingId) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editingId);
      setSaving(false);
      if (error) { toast.error('Erro: ' + error.message); return; }
      toast.success('Cliente atualizado com sucesso!');
    } else {
      const { error } = await supabase.from('clientes').insert(payload);
      setSaving(false);
      if (error) { toast.error('Erro: ' + error.message); return; }
      toast.success('Cliente cadastrado!');
    }

    resetForm();
    setDialogOpen(false);
    fetchClientes();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    // Check if client has linked obras
    const { data: obras } = await supabase.from('obras').select('id').eq('cliente_id', deleteId);
    if (obras && obras.length > 0) {
      toast.error('Este cliente possui obras vinculadas e não pode ser excluído');
      setDeleteDialogOpen(false);
      return;
    }

    const { error } = await supabase.from('clientes').delete().eq('id', deleteId);
    if (error) { toast.error('Erro: ' + error.message); }
    else { toast.success('Cliente excluído com sucesso!'); }
    setDeleteDialogOpen(false);
    fetchClientes();
  };

  const openDelete = (c: any) => {
    setDeleteId(c.id);
    setDeleteNome(c.nome);
    setDeleteDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de clientes e condomínios</p>
        </div>
        {canCreate && (
          <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : clientes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum cliente cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Administradora</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  {canEditCliente && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.cpf_cnpj || '—'}</TableCell>
                    <TableCell>{c.administradora || '—'}</TableCell>
                    <TableCell>{c.telefone || '—'}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    {canEditCliente && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          {isAdmin && (
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDelete(c)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Excluir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Novo / Editar Cliente */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} required /></div>
            <div><Label>CPF/CNPJ</Label><Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} /></div>
            <div><Label>Endereço</Label><Input value={endereco} onChange={e => setEndereco(e.target.value)} /></div>
            <div><Label>Administradora</Label><Input value={administradora} onChange={e => setAdministradora(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{deleteNome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
