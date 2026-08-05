import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';
import type { Atividade } from '../types';

export function useCronogramaAtividades(cronogramaId: string | null) {
  const query = useQuery({
    queryKey: cronogramaKeys.atividades(cronogramaId),
    enabled: !!cronogramaId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Atividade[]> => {
      const { data, error } = await supabase
        .from('cronograma_atividades')
        .select('*')
        .eq('cronograma_id', cronogramaId as string)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, atividades: query.data ?? [] };
}
