import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { diarioKeys } from '../queryKeys';
import type { Diario } from '../types';

/** Lista de diários da obra selecionada (mais recentes primeiro). */
export function useDiarios(obraId: string) {
  const query = useQuery({
    queryKey: diarioKeys.diarios(obraId),
    enabled: !!obraId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Diario[]> => {
      const { data, error } = await supabase
        .from('diario_obra')
        .select('*')
        .eq('obra_id', obraId)
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, diarios: query.data ?? [] };
}
