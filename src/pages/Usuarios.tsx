import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUsuarios } from '@/features/usuarios/hooks/useUsuarios';
import { useObrasUsuarios } from '@/features/usuarios/hooks/useObrasUsuarios';
import { useEmpresasUsuarios } from '@/features/usuarios/hooks/useEmpresasUsuarios';
import { useUsuariosMutations } from '@/features/usuarios/hooks/useUsuariosMutations';
import UsuariosTable from '@/features/usuarios/components/UsuariosTable';
import UsuariosSkeleton from '@/features/usuarios/components/UsuariosSkeleton';
import ErroCarregamento from '@/features/usuarios/components/ErroCarregamento';
import NovoUsuarioDialog from '@/features/usuarios/components/NovoUsuarioDialog';
import EditarUsuarioDialog from '@/features/usuarios/components/EditarUsuarioDialog';
import PermissoesDialog from '@/features/usuarios/components/PermissoesDialog';
import VincularObrasDialog from '@/features/usuarios/components/VincularObrasDialog';
import ResetSenhaDialog from '@/features/usuarios/components/ResetSenhaDialog';
import ExcluirUsuarioDialog from '@/features/usuarios/components/ExcluirUsuarioDialog';
import type { UsuarioMerged } from '@/features/usuarios/types';

export default function Usuarios() {
  const { isAdmin, isSuperAdmin, user, empresaId } = useAuth();

  const [filtroEmpresa, setFiltroEmpresa] = useState('todas');
  const [novoOpen, setNovoOpen] = useState(false);
  const [editar, setEditar] = useState<UsuarioMerged | null>(null);
  const [permissoes, setPermissoes] = useState<UsuarioMerged | null>(null);
  const [vincular, setVincular] = useState<UsuarioMerged | null>(null);
  const [resetar, setResetar] = useState<UsuarioMerged | null>(null);
  const [excluir, setExcluir] = useState<UsuarioMerged | null>(null);

  const { users, isLoading, isError, error, refetch } = useUsuarios({
    isAdmin: !!isAdmin,
    isSuperAdmin: !!isSuperAdmin,
    empresaId: empresaId ?? null,
  });
  const { obras } = useObrasUsuarios();
  const { empresas } = useEmpresasUsuarios(!!isSuperAdmin);
  const { excluirUsuario } = useUsuariosMutations();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredUsers =
    isSuperAdmin && filtroEmpresa !== 'todas'
      ? users.filter((u) => u.empresa_id === filtroEmpresa)
      : users;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de acessos, permissões e vinculação com obras</p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
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
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isError ? (
        <ErroCarregamento message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : isLoading ? (
        <UsuariosSkeleton />
      ) : (
        <UsuariosTable
          users={filteredUsers}
          isSuperAdmin={!!isSuperAdmin}
          currentUserId={user?.id}
          onEditar={setEditar}
          onPermissoes={setPermissoes}
          onVincularObras={setVincular}
          onRedefinirSenha={setResetar}
          onExcluir={setExcluir}
        />
      )}

      <NovoUsuarioDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        obras={obras}
        isSuperAdmin={!!isSuperAdmin}
        empresaId={empresaId ?? null}
      />

      <EditarUsuarioDialog
        usuario={editar}
        users={users}
        open={!!editar}
        onOpenChange={(open) => !open && setEditar(null)}
        obras={obras}
        isSuperAdmin={!!isSuperAdmin}
      />

      <PermissoesDialog
        usuario={permissoes}
        open={!!permissoes}
        onOpenChange={(open) => !open && setPermissoes(null)}
      />

      <VincularObrasDialog
        usuario={vincular}
        open={!!vincular}
        onOpenChange={(open) => !open && setVincular(null)}
        obras={obras}
      />

      <ResetSenhaDialog
        usuario={resetar}
        open={!!resetar}
        onOpenChange={(open) => !open && setResetar(null)}
      />

      <ExcluirUsuarioDialog
        usuario={excluir}
        open={!!excluir}
        onOpenChange={(open) => !open && setExcluir(null)}
        deleting={excluirUsuario.isPending}
        onConfirm={() => {
          if (!excluir) return;
          excluirUsuario.mutate(excluir.user_id, { onSuccess: () => setExcluir(null) });
        }}
      />
    </div>
  );
}
