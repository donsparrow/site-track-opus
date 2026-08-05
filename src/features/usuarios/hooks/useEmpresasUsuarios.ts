import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usuariosKeys } from '../queryKeys';
import type { EmpresaOption } from '../types';

export function useEmpresasUsuarios(isSuperAdmin: boolean) {
  const query = useQuery({
    queryKey: usuariosKeys.empresas,
    enabled: isSuperAdmin,
    queryFn: async (): Promise<EmpresaOption[]> => {
      const { data, error } = await supabase.from('empresas').select('id, nome').order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, empresas: query.data ?? [] };
}
