import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MODULOS } from '@/hooks/usePermissions';
import { usuariosKeys } from '../queryKeys';
import { getDefaultPermsForRole } from '../constants';
import type { PermissaoState } from '../types';

/** Busca sob demanda as permissões customizadas de um usuário (usada nos diálogos). */
export function usePermissoesUsuario(userId: string | null, role: string, enabled: boolean) {
  const query = useQuery({
    queryKey: usuariosKeys.permissoes(userId ?? ''),
    enabled: enabled && !!userId,
    queryFn: async (): Promise<PermissaoState> => {
      const { data, error } = await supabase
        .from('permissoes_usuario')
        .select('modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir')
        .eq('user_id', userId as string);
      if (error) throw error;

      if (data && data.length > 0) {
        const state: PermissaoState = {};
        data.forEach((p) => {
          state[p.modulo] = { v: p.pode_visualizar, c: p.pode_criar, e: p.pode_editar, x: p.pode_excluir };
        });
        MODULOS.forEach((m) => {
          if (!state[m]) state[m] = { v: false, c: false, e: false, x: false };
        });
        return state;
      }
      return getDefaultPermsForRole(role);
    },
  });

  return query;
}
