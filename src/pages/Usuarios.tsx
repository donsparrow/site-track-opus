import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Link2, Trash2 } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  trabalhador: 'Trabalhador',
  sindico: 'Síndico',
  cliente: 'Cliente',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  admin: 'destructive',
  trabalhador: 'default',
  sindico: 'secondary',
  cliente: 'secondary',
};

export default function Usuarios() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoSenha, setNovoSenha] = useState('');
  const [novoTipo, setNovoTipo] = useState('cliente');
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Obra linking dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUserId, setLinkUserId] = useState('');
  const [linkUserName, setLinkUserName] = useState('');
  const [userObras, setUserObras] = useState<any[]>([]);
  const [linkObrasSelecionadas, setLinkObrasSelecionadas] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*').order('nome');
    const { data: roles } = await supabase.from('user_roles').select('*');
    const { data: links } = await supabase.from('usuario_obras').select('*');

    const merged = (profiles || []).map((p: any) => {
      const userRole = (roles || []).find((r: any) => r.user_id === p.user_id);
      const userLinks = (links || []).filter((l: any) => l.user_id === p.user_id);
      return { ...p, role: userRole?.role || 'trabalhador', role_id: userRole?.id, obras_vinculadas: userLinks };
    });
    setUsers(merged);
    setLoading(false);
  };

  const fetchObras = async () => {
    const { data } = await supabase.from('obras').select('id, nome').order('nome');
    setObras(data || []);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchObras();
    }
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', userId);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Papel atualizado!');
      fetchUsers();
    }
  };

  const handleCreateUser = async () => {
    if (!novoNome || !novoEmail || !novoSenha) {
      toast.error('Preencha nome, e-mail e senha');
      return;
    }
    if (novoSenha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      // Create user via Supabase Auth (trigger creates profile + role)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: novoEmail,
        password: novoSenha,
        options: { data: { nome: novoNome } },
      });

      if (authError) throw authError;
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error('Usuário não criado');

      // Update role if not default
      if (novoTipo !== 'trabalhador') {
        // Wait a moment for trigger to create the role row
        await new Promise(r => setTimeout(r, 1000));
        await supabase
          .from('user_roles')
          .update({ role: novoTipo as any })
          .eq('user_id', newUserId);
      }

      // Link to selected obras
      if (obrasSelecionadas.length > 0) {
        await new Promise(r => setTimeout(r, 500));
        const inserts = obrasSelecionadas.map(obra_id => ({
          user_id: newUserId,
          obra_id,
        }));
        await supabase.from('usuario_obras').insert(inserts);
      }

      toast.success('Usuário cadastrado com sucesso!');
      setDialogOpen(false);
      setNovoNome('');
      setNovoEmail('');
      setNovoSenha('');
      setNovoTipo('cliente');
      setObrasSelecionadas([]);
      fetchUsers();
    } catch (err: any) {
      toast.error('Erro ao criar usuário: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openLinkDialog = async (userId: string, userName: string) => {
    setLinkUserId(userId);
    setLinkUserName(userName);
    const { data } = await supabase.from('usuario_obras').select('obra_id').eq('user_id', userId);
    const linked = (data || []).map((d: any) => d.obra_id);
    setLinkObrasSelecionadas(linked);
    setUserObras(data || []);
    setLinkDialogOpen(true);
  };

  const saveLinkObras = async () => {
    // Delete existing links
    await supabase.from('usuario_obras').delete().eq('user_id', linkUserId);
    // Insert new links
    if (linkObrasSelecionadas.length > 0) {
      const inserts = linkObrasSelecionadas.map(obra_id => ({
        user_id: linkUserId,
        obra_id,
      }));
      await supabase.from('usuario_obras').insert(inserts);
    }
    toast.success('Obras vinculadas atualizadas!');
    setLinkDialogOpen(false);
    fetchUsers();
  };

  const toggleObra = (obraId: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(obraId) ? list.filter(id => id !== obraId) : [...list, obraId]);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de acessos, permissões e vinculação com obras</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Obras Vinculadas</TableHead>
                  <TableHead>Alterar Papel</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome || '—'}</TableCell>
                    <TableCell>{u.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[u.role] || 'secondary'}>
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.obras_vinculadas?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.obras_vinculadas.map((link: any) => {
                            const obra = obras.find(o => o.id === link.obra_id);
                            return (
                              <Badge key={link.id} variant="secondary" className="text-xs">
                                {obra?.nome || 'Obra'}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.user_id === user?.id ? (
                        <span className="text-xs text-muted-foreground">Você</span>
                      ) : (
                        <Select value={u.role} onValueChange={(val) => changeRole(u.user_id, val)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="trabalhador">Trabalhador</SelectItem>
                            <SelectItem value="sindico">Síndico</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.user_id !== user?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openLinkDialog(u.user_id, u.nome)}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Vincular Obras
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Novo Usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>E-mail (login) *</Label>
              <Input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={novoSenha} onChange={e => setNovoSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Tipo de Usuário</Label>
              <Select value={novoTipo} onValueChange={setNovoTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="trabalhador">Trabalhador</SelectItem>
                  <SelectItem value="sindico">Síndico</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vincular Obras</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 mt-1">
                {obras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada</p>
                ) : (
                  obras.map(obra => (
                    <label key={obra.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={obrasSelecionadas.includes(obra.id)}
                        onCheckedChange={() => toggleObra(obra.id, obrasSelecionadas, setObrasSelecionadas)}
                      />
                      <span className="text-sm">{obra.nome}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button onClick={handleCreateUser} disabled={saving} className="w-full">
              {saving ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vincular Obras */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular Obras — {linkUserName}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md p-3 max-h-64 overflow-y-auto space-y-2">
            {obras.map(obra => (
              <label key={obra.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={linkObrasSelecionadas.includes(obra.id)}
                  onCheckedChange={() => toggleObra(obra.id, linkObrasSelecionadas, setLinkObrasSelecionadas)}
                />
                <span className="text-sm">{obra.nome}</span>
              </label>
            ))}
          </div>
          <Button onClick={saveLinkObras} className="w-full">Salvar Vinculações</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
