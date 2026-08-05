import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ferramentasKeys } from '../queryKeys';
import type { Ferramenta } from '../types';
import { useFerramentasScope } from './useObrasFerramentas';

export function useFerramentas() {
  const { empresaId, obrasFilterLoading } = useFerramentasScope();

  const query = useQuery({
    queryKey: ferramentasKeys.lista(empresaId),
    enabled: !obrasFilterLoading,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Ferramenta[]> => {
      const { data, error } = await supabase.from('ferramentas').select('*').order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, ferramentas: query.data ?? [] };
}
