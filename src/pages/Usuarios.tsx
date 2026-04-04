import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Link2, KeyRound, Copy, RefreshCw, Pencil, Trash2, Shield } from 'lucide-react';
import { MODULOS, MODULO_LABELS, type Modulo, type Permissao } from '@/hooks/usePermissions';

const roleLabels: Record<string, string> = {
  super_admin: 'Administrador Geral',
  admin: 'Diretor',
  trabalhador: 'Funcionário',
  sindico: 'Síndico',
  cliente: 'Cliente',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  super_admin: 'destructive',
  admin: 'outline',
  trabalhador: 'default',
  sindico: 'secondary',
  cliente: 'secondary',
};

const roleBadgeClassName: Record<string, string> = {
  admin: 'border-transparent bg-green-600 text-white hover:bg-green-600/80',
};

const DEFAULT_PERMISSIONS: Record<string, Record<Modulo, { v: boolean; c: boolean; e: boolean; x: boolean }>> = {
  super_admin: Object.fromEntries(MODULOS.map(m => [m, { v: true, c: true, e: true, x: true }])) as any,
  admin: Object.fromEntries(MODULOS.map(m => [m, { v: true, c: true, e: true, x: true }])) as any,
  trabalhador: {
    dashboard: { v: true, c: false, e: false, x: false },
    financeiro: { v: false, c: false, e: false, x: false },
    diario_obra: { v: true, c: true, e: false, x: false },
    cronograma: { v: true, c: false, e: false, x: false },
    relatorios: { v: true, c: false, e: false, x: false },
    documentos: { v: true, c: false, e: false, x: false },
    usuarios: { v: false, c: false, e: false, x: false },
  },
  sindico: {
    dashboard: { v: true, c: false, e: false, x: false },
    financeiro: { v: false, c: false, e: false, x: false },
    diario_obra: { v: true, c: false, e: false, x: false },
    cronograma: { v: true, c: false, e: false, x: false },
    relatorios: { v: true, c: false, e: false, x: false },
    documentos: { v: true, c: false, e: false, x: false },
    usuarios: { v: false, c: false, e: false, x: false },
  },
  cliente: {
    dashboard: { v: true, c: false, e: false, x: false },
    financeiro: { v: false, c: false, e: false, x: false },
    diario_obra: { v: true, c: false, e: false, x: false },
    cronograma: { v: true, c: false, e: false, x: false },
    relatorios: { v: true, c: false, e: false, x: false },
    documentos: { v: true, c: false, e: false, x: false },
    usuarios: { v: false, c: false, e: false, x: false },
  },
};

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

interface PermissaoState {
  [modulo: string]: { v: boolean; c: boolean; e: boolean; x: boolean };
}

function getDefaultPermsForRole(role: string): PermissaoState {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['cliente'];
}

function PermissoesEditor({ perms, setPerms, disabled }: { perms: PermissaoState; setPerms: (p: PermissaoState) => void; disabled?: boolean }) {
  const toggle = (modulo: string, field: 'v' | 'c' | 'e' | 'x') => {
    setPerms({
      ...perms,
      [modulo]: { ...perms[modulo], [field]: !perms[modulo][field] },
    });
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted px-3 py-2 flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Permissões de Acesso</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium">Módulo</th>
              <th className="text-center px-2 py-2 font-medium">Ver</th>
              <th className="text-center px-2 py-2 font-medium">Criar</th>
              <th className="text-center px-2 py-2 font-medium">Editar</th>
              <th className="text-center px-2 py-2 font-medium">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {MODULOS.map(m => (
              <tr key={m} className="border-b last:border-b-0">
                <td className="px-3 py-2 text-muted-foreground">{MODULO_LABELS[m]}</td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.v || false} onCheckedChange={() => toggle(m, 'v')} disabled={disabled} />
                </td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.c || false} onCheckedChange={() => toggle(m, 'c')} disabled={disabled} />
                </td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.e || false} onCheckedChange={() => toggle(m, 'e')} disabled={disabled} />
                </td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.x || false} onCheckedChange={() => toggle(m, 'x')} disabled={disabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const { isAdmin, isSuperAdmin, user, empresaId } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas');
  const [loading, setLoading] = useState(true);

  // New user form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoSenha, setNovoSenha] = useState('');
  const [novoTipo, setNovoTipo] = useState('cliente');
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([]);
  const [novoPerms, setNovoPerms] = useState<PermissaoState>(getDefaultPermsForRole('cliente'));
  const [saving, setSaving] = useState(false);

  // Edit user
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editObrasSelecionadas, setEditObrasSelecionadas] = useState<string[]>([]);
  const [editPerms, setEditPerms] = useState<PermissaoState>(getDefaultPermsForRole('cliente'));
  const [editSaving, setEditSaving] = useState(false);

  // Delete user
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Obra linking dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUserId, setLinkUserId] = useState('');
  const [linkUserName, setLinkUserName] = useState('');
  const [linkObrasSelecionadas, setLinkObrasSelecionadas] = useState<string[]>([]);

  // Password reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Permissions dialog
  const [permsDialogOpen, setPermsDialogOpen] = useState(false);
  const [permsUserId, setPermsUserId] = useState('');
  const [permsUserName, setPermsUserName] = useState('');
  const [permsUserRole, setPermsUserRole] = useState('');
  const [permsState, setPermsState] = useState<PermissaoState>(getDefaultPermsForRole('cliente'));
  const [permsSaving, setPermsSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles
    let profilesQuery = supabase.from('profiles').select('*').order('nome');
    if (!isSuperAdmin && empresaId) {
      profilesQuery = profilesQuery.eq('empresa_id', empresaId);
    }
    
    const [profilesRes, rolesRes, linksRes, obrasRes] = await Promise.all([
      profilesQuery,
      supabase.from('user_roles').select('*'),
      supabase.from('usuario_obras').select('*'),
      supabase.from('obras').select('id, empresa_id'),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const links = linksRes.data || [];
    const allObras = obrasRes.data || [];

    // Fetch empresas names for joining
    let empresasMap: Record<string, string> = {};
    if (isSuperAdmin) {
      const { data: empData } = await supabase.from('empresas').select('id, nome');
      (empData || []).forEach((e: any) => { empresasMap[e.id] = e.nome; });
    }

    const merged = profiles.map((p: any) => {
      const userRole = roles.find((r: any) => r.user_id === p.user_id);
      const userLinks = links.filter((l: any) => l.user_id === p.user_id);
      const userRoleName = userRole?.role || 'trabalhador';
      
      // Admin/trabalhador have access to all obras in their empresa
      // Cliente/sindico only see linked obras
      let obrasCount = 0;
      if (userRoleName === 'super_admin') {
        obrasCount = allObras.length;
      } else if (userRoleName === 'admin' || userRoleName === 'trabalhador') {
        obrasCount = p.empresa_id 
          ? allObras.filter((o: any) => o.empresa_id === p.empresa_id).length 
          : 0;
      } else {
        // cliente/sindico: only usuario_obras links
        const linkedObraIds = new Set(userLinks.map((l: any) => l.obra_id));
        obrasCount = linkedObraIds.size;
      }

      return {
        ...p,
        role: userRoleName,
        role_id: userRole?.id,
        obras_vinculadas: userLinks,
        obras_count: obrasCount,
        empresa_nome: p.empresa_id ? (empresasMap[p.empresa_id] || '—') : 'Sem empresa',
      };
    });
    setUsers(merged);
    setLoading(false);
  };

  const fetchObras = async () => {
    const { data } = await supabase.from('obras').select('id, nome').order('nome');
    setObras(data || []);
  };

  const fetchEmpresas = async () => {
    if (!isSuperAdmin) return;
    const { data } = await supabase.from('empresas').select('id, nome').order('nome');
    setEmpresas(data || []);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchObras();
      fetchEmpresas();
    }
  }, [isAdmin, empresaId, isSuperAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleCreateUser = async () => {
    if (!novoNome || !novoEmail || !novoSenha) {
      toast.error('Preencha nome, e-mail e senha');
      return;
    }
    if (novoSenha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (novoTipo === 'super_admin' && !isSuperAdmin) {
      toast.error('Apenas Administrador Geral pode criar outro Administrador Geral');
      return;
    }
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: novoEmail,
        password: novoSenha,
        options: { data: { nome: novoNome, empresa_id: empresaId } },
      });

      if (authError) throw authError;
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error('Usuário não criado');

      if (novoTipo !== 'trabalhador') {
        await new Promise(r => setTimeout(r, 1000));
        await supabase
          .from('user_roles')
          .update({ role: novoTipo as any })
          .eq('user_id', newUserId);
      }

      if (obrasSelecionadas.length > 0) {
        await new Promise(r => setTimeout(r, 500));
        const inserts = obrasSelecionadas.map(obra_id => ({
          user_id: newUserId,
          obra_id,
        }));
        await supabase.from('usuario_obras').insert(inserts);
      }

      // Save custom permissions
      await savePermissions(newUserId, novoPerms);

      toast.success('Usuário cadastrado com sucesso!');
      setDialogOpen(false);
      setNovoNome('');
      setNovoEmail('');
      setNovoSenha('');
      setNovoTipo('cliente');
      setObrasSelecionadas([]);
      setNovoPerms(getDefaultPermsForRole('cliente'));
      fetchUsers();
    } catch (err: any) {
      toast.error('Erro ao criar usuário: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async (userId: string, perms: PermissaoState) => {
    // Delete existing
    await supabase.from('permissoes_usuario').delete().eq('user_id', userId);
    // Insert new
    const rows = MODULOS.map(m => ({
      user_id: userId,
      modulo: m,
      pode_visualizar: perms[m]?.v || false,
      pode_criar: perms[m]?.c || false,
      pode_editar: perms[m]?.e || false,
      pode_excluir: perms[m]?.x || false,
    }));
    await supabase.from('permissoes_usuario').insert(rows);
  };

  // Edit user
  const openEditDialog = async (u: any) => {
    setEditUserId(u.user_id);
    setEditNome(u.nome || '');
    setEditEmail(u.email || '');
    setEditTipo(u.role);
    const linked = (u.obras_vinculadas || []).map((l: any) => l.obra_id);
    setEditObrasSelecionadas(linked);

    // Load permissions
    const { data: permsData } = await supabase
      .from('permissoes_usuario')
      .select('modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir')
      .eq('user_id', u.user_id);

    if (permsData && permsData.length > 0) {
      const state: PermissaoState = {};
      permsData.forEach((p: any) => {
        state[p.modulo] = { v: p.pode_visualizar, c: p.pode_criar, e: p.pode_editar, x: p.pode_excluir };
      });
      // Fill missing modules
      MODULOS.forEach(m => {
        if (!state[m]) state[m] = { v: false, c: false, e: false, x: false };
      });
      setEditPerms(state);
    } else {
      setEditPerms(getDefaultPermsForRole(u.role));
    }

    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editNome) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (editTipo === 'super_admin' && !isSuperAdmin) {
      toast.error('Apenas Administrador Geral pode promover a Administrador Geral');
      return;
    }
    // Find current role of edited user
    const editedUser = users.find(u => u.user_id === editUserId);
    if (editedUser?.role === 'super_admin' && editTipo !== 'super_admin') {
      // Check if this is the last super_admin
      const superAdminCount = users.filter(u => u.role === 'super_admin').length;
      if (superAdminCount <= 1) {
        toast.error('Não é possível remover o último Administrador Geral do sistema');
        return;
      }
    }
    setEditSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome: editNome, email: editEmail })
        .eq('user_id', editUserId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editTipo as any })
        .eq('user_id', editUserId);
      if (roleError) throw roleError;

      await supabase.from('usuario_obras').delete().eq('user_id', editUserId);
      if (editObrasSelecionadas.length > 0) {
        const inserts = editObrasSelecionadas.map(obra_id => ({
          user_id: editUserId,
          obra_id,
        }));
        await supabase.from('usuario_obras').insert(inserts);
      }

      // Save permissions
      await savePermissions(editUserId, editPerms);

      toast.success('Usuário atualizado com sucesso!');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Permissions dialog
  const openPermsDialog = async (u: any) => {
    setPermsUserId(u.user_id);
    setPermsUserName(u.nome || '');
    setPermsUserRole(u.role);

    const { data: permsData } = await supabase
      .from('permissoes_usuario')
      .select('modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir')
      .eq('user_id', u.user_id);

    if (permsData && permsData.length > 0) {
      const state: PermissaoState = {};
      permsData.forEach((p: any) => {
        state[p.modulo] = { v: p.pode_visualizar, c: p.pode_criar, e: p.pode_editar, x: p.pode_excluir };
      });
      MODULOS.forEach(m => {
        if (!state[m]) state[m] = { v: false, c: false, e: false, x: false };
      });
      setPermsState(state);
    } else {
      setPermsState(getDefaultPermsForRole(u.role));
    }

    setPermsDialogOpen(true);
  };

  const handleSavePerms = async () => {
    setPermsSaving(true);
    try {
      await savePermissions(permsUserId, permsState);
      toast.success('Permissões atualizadas!');
      setPermsDialogOpen(false);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setPermsSaving(false);
    }
  };

  // Delete user
  const openDeleteDialog = (userId: string, userName: string) => {
    setDeleteUserId(userId);
    setDeleteUserName(userName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    // Prevent deleting a super_admin if not super_admin
    const targetUser = users.find(u => u.user_id === deleteUserId);
    if (targetUser?.role === 'super_admin' && !isSuperAdmin) {
      toast.error('Apenas Administrador Geral pode excluir outro Administrador Geral');
      setDeleteDialogOpen(false);
      return;
    }
    if (targetUser?.role === 'super_admin') {
      const superAdminCount = users.filter(u => u.role === 'super_admin').length;
      if (superAdminCount <= 1) {
        toast.error('Não é possível excluir o último Administrador Geral do sistema');
        setDeleteDialogOpen(false);
        return;
      }
    }
    setDeleting(true);
    try {
      const response = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: deleteUserId },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast.success('Usuário excluído com sucesso!');
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openLinkDialog = async (userId: string, userName: string) => {
    setLinkUserId(userId);
    setLinkUserName(userName);
    const { data } = await supabase.from('usuario_obras').select('obra_id').eq('user_id', userId);
    setLinkObrasSelecionadas((data || []).map((d: any) => d.obra_id));
    setLinkDialogOpen(true);
  };

  const saveLinkObras = async () => {
    await supabase.from('usuario_obras').delete().eq('user_id', linkUserId);
    if (linkObrasSelecionadas.length > 0) {
      const inserts = linkObrasSelecionadas.map(obra_id => ({ user_id: linkUserId, obra_id }));
      await supabase.from('usuario_obras').insert(inserts);
    }
    toast.success('Obras vinculadas atualizadas!');
    setLinkDialogOpen(false);
    fetchUsers();
  };

  const openResetDialog = (userId: string, userName: string) => {
    setResetUserId(userId);
    setResetUserName(userName);
    setNewPassword('');
    setConfirmPassword('');
    setResetDialogOpen(true);
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setNewPassword(pwd);
    setConfirmPassword(pwd);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    toast.success('Senha copiada!');
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) { toast.error('Preencha os campos de senha'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    if (newPassword.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return; }
    setResetting(true);
    try {
      const response = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: resetUserId, new_password: newPassword },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast.success('Senha redefinida com sucesso!');
      setResetDialogOpen(false);
    } catch (err: any) {
      toast.error('Erro ao redefinir senha: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const toggleObra = (obraId: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(obraId) ? list.filter(id => id !== obraId) : [...list, obraId]);
  };

  const isFullAccessRole = (role: string) => role === 'super_admin' || role === 'admin';

  const filteredUsers = isSuperAdmin && filtroEmpresa !== 'todas'
    ? users.filter(u => u.empresa_id === filtroEmpresa)
    : users;

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

      {isSuperAdmin && (
        <div className="mb-4 flex items-center gap-3">
          <Label className="text-sm font-medium">Filtrar por empresa:</Label>
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail (Login)</TableHead>
                  <TableHead>Tipo</TableHead>
                  {isSuperAdmin && <TableHead>Empresa</TableHead>}
                  <TableHead>Obras Vinculadas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome || '—'}</TableCell>
                    <TableCell>{u.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[u.role] || 'secondary'} className={roleBadgeClassName[u.role] || ''}>
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <span className="text-sm">{u.empresa_nome}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      {(u.obras_count || 0) > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs px-2 py-1 h-auto underline-offset-2 hover:underline"
                          onClick={() => openLinkDialog(u.user_id, u.nome)}
                          title="Ver obras vinculadas"
                        >
                          {u.obras_count === 1 ? '1 obra' : `${u.obras_count} obras`}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">0 obras</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.user_id !== user?.id && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(u)} title="Editar usuário">
                              <Pencil className="h-4 w-4 mr-1" /> Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openPermsDialog(u)} title="Permissões">
                              <Shield className="h-4 w-4 mr-1" /> Permissões
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openLinkDialog(u.user_id, u.nome)} title="Vincular obras">
                              <Link2 className="h-4 w-4 mr-1" /> Obras
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openResetDialog(u.user_id, u.nome)} title="Redefinir senha">
                              <KeyRound className="h-4 w-4 mr-1" /> Senha
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(u.user_id, u.nome)} title="Excluir usuário">
                              <Trash2 className="h-4 w-4 mr-1" /> Excluir
                            </Button>
                          </>
                        )}
                        {u.user_id === user?.id && (
                          <span className="text-xs text-muted-foreground">Você</span>
                        )}
                      </div>
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
              <div className="flex gap-2">
                <Input type="text" value={novoSenha} onChange={e => setNovoSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <Button type="button" variant="outline" size="icon" onClick={() => setNovoSenha(generatePassword())} title="Gerar senha">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Tipo de Usuário</Label>
              <Select value={novoTipo} onValueChange={(v) => { setNovoTipo(v); setNovoPerms(getDefaultPermsForRole(v)); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="super_admin">Administrador Geral</SelectItem>}
                  <SelectItem value="admin">Diretor</SelectItem>
                  <SelectItem value="trabalhador">Funcionário</SelectItem>
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
            <Separator />
            <PermissoesEditor
              perms={novoPerms}
              setPerms={setNovoPerms}
              disabled={isFullAccessRole(novoTipo)}
            />
            {isFullAccessRole(novoTipo) && (
              <p className="text-xs text-muted-foreground">Diretores sempre possuem acesso total.</p>
            )}
            <Button onClick={handleCreateUser} disabled={saving} className="w-full">
              {saving ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Tipo de Usuário</Label>
              <Select value={editTipo} onValueChange={(v) => { setEditTipo(v); if (isFullAccessRole(v)) setEditPerms(getDefaultPermsForRole(v)); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="super_admin">Administrador Geral</SelectItem>}
                  <SelectItem value="admin">Diretor</SelectItem>
                  <SelectItem value="trabalhador">Funcionário</SelectItem>
                  <SelectItem value="sindico">Síndico</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Obras Vinculadas</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 mt-1">
                {obras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada</p>
                ) : (
                  obras.map(obra => (
                    <label key={obra.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={editObrasSelecionadas.includes(obra.id)}
                        onCheckedChange={() => toggleObra(obra.id, editObrasSelecionadas, setEditObrasSelecionadas)}
                      />
                      <span className="text-sm">{obra.nome}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Separator />
            <PermissoesEditor
              perms={editPerms}
              setPerms={setEditPerms}
              disabled={isFullAccessRole(editTipo)}
            />
            {isFullAccessRole(editTipo) && (
              <p className="text-xs text-muted-foreground">Diretores sempre possuem acesso total.</p>
            )}
            <Button onClick={handleEditUser} disabled={editSaving} className="w-full">
              {editSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Permissões */}
      <Dialog open={permsDialogOpen} onOpenChange={setPermsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissões — {permsUserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={roleBadgeVariant[permsUserRole] || 'secondary'} className={roleBadgeClassName[permsUserRole] || ''}>
                {roleLabels[permsUserRole] || permsUserRole}
              </Badge>
            </div>
            <PermissoesEditor
              perms={permsState}
              setPerms={setPermsState}
              disabled={isFullAccessRole(permsUserRole)}
            />
            {isFullAccessRole(permsUserRole) && (
              <p className="text-xs text-muted-foreground">Este tipo de usuário sempre possui acesso total.</p>
            )}
            <Button onClick={handleSavePerms} disabled={permsSaving || isFullAccessRole(permsUserRole)} className="w-full">
              {permsSaving ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteUserName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Dialog: Redefinir Senha */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir Senha — {resetUserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova Senha *</Label>
              <div className="flex gap-2">
                <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <Button type="button" variant="outline" size="icon" onClick={handleGeneratePassword} title="Gerar senha automática">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {newPassword && (
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword} title="Copiar senha">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Confirmar Senha *</Label>
              <Input type="text" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">As senhas não coincidem</p>
            )}
            <Button onClick={handleResetPassword} disabled={resetting || !newPassword || newPassword !== confirmPassword} className="w-full">
              {resetting ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
