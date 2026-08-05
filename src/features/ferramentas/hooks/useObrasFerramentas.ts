import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { ferramentasKeys } from '../queryKeys';
import type { ObraOption } from '../types';

/** Escopo compartilhado do módulo: empresa do usuário + obras que ele pode acessar. */
export function useFerramentasScope() {
  const { empresaId, user } = useAuth();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  return { empresaId, user, filterObras, obrasFilterLoading };
}

export function useObrasFerramentas() {
  const { empresaId, filterObras, obrasFilterLoading } = useFerramentasScope();

  const query = useQuery({
    queryKey: ferramentasKeys.obras(empresaId),
    enabled: !obrasFilterLoading,
    queryFn: async (): Promise<ObraOption[]> => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, status')
        .order('nome');
      if (error) throw error;
      return filterObras((data || []) as ObraOption[]);
    },
  });

  return { ...query, obras: query.data ?? [] };
}
