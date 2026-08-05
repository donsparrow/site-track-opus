import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ferramentasKeys } from '../queryKeys';
import type { FerramentaHistorico } from '../types';

export function useFerramentaHistorico(ferramentaId: string | null, enabled: boolean) {
  const query = useQuery({
    queryKey: ferramentasKeys.historico(ferramentaId),
    enabled: enabled && !!ferramentaId,
    queryFn: async (): Promise<FerramentaHistorico[]> => {
      const { data, error } = await supabase
        .from('ferramentas_historico')
        .select('*')
        .eq('ferramenta_id', ferramentaId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, historico: query.data ?? [] };
}
