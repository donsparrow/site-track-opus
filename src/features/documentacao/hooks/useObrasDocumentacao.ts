import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { documentacaoKeys } from '../queryKeys';
import type { ObraOption } from '../types';

/**
 * Escopo compartilhado do módulo: empresa do usuário + obras que ele pode acessar.
 */
export function useDocumentacaoScope() {
  const { empresaId, role } = useAuth();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  const canManage = role === 'admin' || role === 'trabalhador';
  return { empresaId, filterObras, obrasFilterLoading, canManage };
}

export function useObrasDocumentacao() {
  const { filterObras, obrasFilterLoading } = useDocumentacaoScope();

  const query = useQuery({
    queryKey: documentacaoKeys.obras(null),
    enabled: !obrasFilterLoading,
    queryFn: async (): Promise<ObraOption[]> => {
      const { data, error } = await supabase.from('obras').select('id, nome').order('nome');
      if (error) throw error;
      return filterObras((data || []) as ObraOption[]);
    },
  });

  return { ...query, obras: query.data ?? [] };
}
