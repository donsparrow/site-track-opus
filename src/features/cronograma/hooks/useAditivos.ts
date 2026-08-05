import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';
import type { Aditivo } from '../types';

export function useAditivos(obraId: string) {
  const query = useQuery({
    queryKey: cronogramaKeys.aditivos(obraId),
    enabled: !!obraId,
    queryFn: async (): Promise<Aditivo[]> => {
      const { data, error } = await supabase
        .from('obra_aditivos')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, aditivos: query.data ?? [] };
}
