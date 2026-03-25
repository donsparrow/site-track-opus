import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(true);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*').order('nome');
    const { data: roles } = await supabase.from('user_roles').select('*');

    const merged = (profiles || []).map((p: any) => {
      const userRole = (roles || []).find((r: any) => r.user_id === p.user_id);
      return { ...p, role: userRole?.role || 'trabalhador', role_id: userRole?.id };
    });
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Usuários</h1>
        <p className="text-muted-foreground mt-1">Gerenciamento de acessos e permissões</p>
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
                  <TableHead>Papel Atual</TableHead>
                  <TableHead>Alterar Papel</TableHead>
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
                      {u.user_id === user?.id ? (
                        <span className="text-xs text-muted-foreground">Você</span>
                      ) : (
                        <Select value={u.role} onValueChange={(val) => changeRole(u.user_id, val)}>
                          <SelectTrigger className="w-40">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
