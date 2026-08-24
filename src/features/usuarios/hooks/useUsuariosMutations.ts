import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MODULOS } from '@/hooks/usePermissions';
import type { Database } from '@/integrations/supabase/types';
import { usuariosPrefixes, usuariosKeys } from '../queryKeys';
import type { PermissaoState } from '../types';

type AppRole = Database['public']['Enums']['app_role'];

interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  empresaId: string | null;
  obraIds: string[];
  perms: PermissaoState;
}

interface EditarUsuarioInput {
  userId: string;
  nome: string;
  email: string;
  tipo: string;
  obraIds: string[];
  perms: PermissaoState;
}

interface SalvarPermissoesInput {
  userId: string;
  perms: PermissaoState;
}

interface SalvarVinculoObrasInput {
  userId: string;
  obraIds: string[];
}

interface ResetSenhaInput {
  userId: string;
  novaSenha: string;
}

/** Substitui todas as permissões customizadas de um usuário. */
async function savePermissions(userId: string, perms: PermissaoState) {
  const { error: delError } = await supabase.from('permissoes_usuario').delete().eq('user_id', userId);
  if (delError) throw delError;
  const rows = MODULOS.map((m) => ({
    user_id: userId,
    modulo: m,
    pode_visualizar: perms[m]?.v || false,
    pode_criar: perms[m]?.c || false,
    pode_editar: perms[m]?.e || false,
    pode_excluir: perms[m]?.x || false,
  }));
  const { error: insError } = await supabase.from('permissoes_usuario').insert(rows);
  if (insError) throw insError;
}

/** Substitui todos os vínculos de obra de um usuário. */
async function saveVinculoObras(userId: string, obraIds: string[]) {
  const { error: delError } = await supabase.from('usuario_obras').delete().eq('user_id', userId);
  if (delError) throw delError;
  if (obraIds.length > 0) {
    const inserts = obraIds.map((obra_id) => ({ user_id: userId, obra_id }));
    const { error: insError } = await supabase.from('usuario_obras').insert(inserts);
    if (insError) throw insError;
  }
}

export function useUsuariosMutations() {
  const qc = useQueryClient();

  const invalidateUsuarios = () =>
    qc.invalidateQueries({ queryKey: usuariosPrefixes.usuarios });

  const onError = (error: unknown) =>
    toast.error('Erro: ' + (error instanceof Error ? error.message : 'desconhecido'));

  const criarUsuario = useMutation({
    mutationFn: async ({ nome, email, senha, tipo, empresaId, obraIds, perms }: CriarUsuarioInput) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, empresa_id: empresaId } },
      });
      if (authError) throw authError;
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error('Usuário não criado');

      if (tipo !== 'trabalhador') {
        await new Promise((r) => setTimeout(r, 1000));
        const { error } = await supabase
          .from('user_roles')
          .update({ role: tipo as AppRole })
          .eq('user_id', newUserId);
        if (error) throw error;
      }

      if (obraIds.length > 0) {
        await new Promise((r) => setTimeout(r, 500));
        const inserts = obraIds.map((obra_id) => ({ user_id: newUserId, obra_id }));
        const { error } = await supabase.from('usuario_obras').insert(inserts);
        if (error) throw error;
      }

      await savePermissions(newUserId, perms);
    },
    onSuccess: () => {
      toast.success('Usuário cadastrado com sucesso!');
      invalidateUsuarios();
    },
    onError: (error) => onError2(error, 'Erro ao criar usuário: '),
  });

  const editarUsuario = useMutation({
    mutationFn: async ({ userId, nome, email, tipo, obraIds, perms }: EditarUsuarioInput) => {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome, email })
        .eq('user_id', userId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: tipo as AppRole })
        .eq('user_id', userId);
      if (roleError) throw roleError;

      await saveVinculoObras(userId, obraIds);
      await savePermissions(userId, perms);
    },
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!');
      invalidateUsuarios();
    },
    onError: (error) => onError2(error, 'Erro ao atualizar: '),
  });

  const salvarPermissoes = useMutation({
    mutationFn: async ({ userId, perms }: SalvarPermissoesInput) => {
      await savePermissions(userId, perms);
    },
    onSuccess: (_data, { userId }) => {
      toast.success('Permissões atualizadas!');
      invalidateUsuarios();
      qc.invalidateQueries({ queryKey: usuariosKeys.permissoes(userId) });
      // Nota: usePermissions (src/hooks/usePermissions) não usa React Query;
      // ele busca as permissões do usuário logado via useEffect próprio, então
      // não há cache adicional a invalidar aqui.
    },
    onError,
  });

  const salvarVinculoObras = useMutation({
    mutationFn: async ({ userId, obraIds }: SalvarVinculoObrasInput) => {
      await saveVinculoObras(userId, obraIds);
    },
    onSuccess: () => {
      toast.success('Obras vinculadas atualizadas!');
      invalidateUsuarios();
    },
    onError,
  });

  const excluirUsuario = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });
      if (response.data?.error) throw new Error(response.data.error);
      if (response.error) throw new Error(response.error.message);
    },
    onSuccess: () => {
      toast.success('Usuário excluído com sucesso!');
      invalidateUsuarios();
    },
    onError: (error) => onError2(error, 'Erro ao excluir: '),
  });

  const resetSenha = useMutation({
    mutationFn: async ({ userId, novaSenha }: ResetSenhaInput) => {
      const response = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: userId, new_password: novaSenha },
      });
      if (response.data?.error) throw new Error(response.data.error);
      if (response.error) throw new Error(response.error.message);
    },
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso!');
    },
    onError: (error) => onError2(error, 'Erro ao redefinir senha: '),
  });

  return {
    criarUsuario,
    editarUsuario,
    salvarPermissoes,
    salvarVinculoObras,
    excluirUsuario,
    resetSenha,
  };
}

function onError2(error: unknown, prefix: string) {
  toast.error(prefix + (error instanceof Error ? error.message : 'desconhecido'));
}
