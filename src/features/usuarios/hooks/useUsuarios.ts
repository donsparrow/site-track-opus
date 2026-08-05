import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usuariosKeys } from '../queryKeys';
import type { UsuarioMerged } from '../types';

interface Options {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  empresaId: string | null;
}

/** Lista mesclada de usuários (profiles + roles + obras vinculadas + empresa). */
export function useUsuarios({ isAdmin, isSuperAdmin, empresaId }: Options) {
  const query = useQuery({
    queryKey: usuariosKeys.list(empresaId, isSuperAdmin),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<UsuarioMerged[]> => {
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

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (linksRes.error) throw linksRes.error;
      if (obrasRes.error) throw obrasRes.error;

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const links = linksRes.data || [];
      const allObras = obrasRes.data || [];

      let empresasMap: Record<string, string> = {};
      if (isSuperAdmin) {
        const { data: empData } = await supabase.from('empresas').select('id, nome');
        (empData || []).forEach((e) => { empresasMap[e.id] = e.nome; });
      }

      return profiles.map((p) => {
        const userRole = roles.find((r) => r.user_id === p.user_id);
        const userLinks = links.filter((l) => l.user_id === p.user_id);
        const userRoleName = userRole?.role || 'trabalhador';

        // Admin/trabalhador têm acesso a todas as obras da empresa.
        // Cliente/síndico só veem obras vinculadas.
        let obrasCount = 0;
        if (userRoleName === 'super_admin') {
          obrasCount = allObras.length;
        } else if (userRoleName === 'admin') {
          obrasCount = p.empresa_id
            ? allObras.filter((o) => o.empresa_id === p.empresa_id).length
            : 0;
        } else {
          const linkedObraIds = new Set(userLinks.map((l) => l.obra_id));
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
    },
  });

  return { ...query, users: query.data ?? [] };
}
