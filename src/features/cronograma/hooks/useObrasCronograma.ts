import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';
import type { ObraOption } from '../types';
import { useCronogramaScope } from './useCronogramaScope';

export function useObrasCronograma() {
  const { empresaId, filterObras, obrasFilterLoading } = useCronogramaScope();

  const query = useQuery({
    queryKey: [...cronogramaKeys.obras(empresaId)],
    enabled: !obrasFilterLoading,
    queryFn: async (): Promise<ObraOption[]> => {
      const { data, error } = await supabase.from('obras').select('id, nome').order('nome');
      if (error) throw error;
      return filterObras((data || []) as ObraOption[]);
    },
  });

  return { ...query, obras: query.data ?? [] };
}
