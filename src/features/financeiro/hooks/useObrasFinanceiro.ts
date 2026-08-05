import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { financeiroKeys } from '../queryKeys';
import type { ObraOption } from '../types';

/**
 * Escopo compartilhado do módulo: empresa do usuário + obras que ele pode acessar.
 * Mantém exatamente a mesma regra do `useObrasFiltered` usada hoje.
 */
export function useFinanceiroScope() {
  const { empresaId } = useAuth();
  const { allowedObraIds, loading: obrasFilterLoading } = useObrasFiltered();
  return { empresaId, allowedObraIds, obrasFilterLoading };
}

export function useObrasFinanceiro() {
  const { empresaId, allowedObraIds, obrasFilterLoading } = useFinanceiroScope();

  const query = useQuery({
    queryKey: [...financeiroKeys.obras(empresaId), allowedObraIds],
    enabled: !obrasFilterLoading,
    queryFn: async (): Promise<ObraOption[]> => {
      const { data, error } = await supabase.from('obras').select('id, nome').order('nome');
      if (error) throw error;
      const list = (data || []) as ObraOption[];
      if (allowedObraIds === null) return list;
      return list.filter((o) => allowedObraIds.includes(o.id));
    },
  });

  return { ...query, obras: query.data ?? [] };
}
