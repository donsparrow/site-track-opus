import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { documentacaoKeys } from '../queryKeys';
import type { Pasta } from '../types';

export function usePastas(obraId: string | null) {
  const query = useQuery({
    queryKey: documentacaoKeys.pastas(obraId),
    enabled: !!obraId,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<Pasta[]> => {
      const { data, error } = await supabase
        .from('documentos_pastas')
        .select('*')
        .eq('obra_id', obraId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Pasta[];
    },
  });

  return { ...query, pastas: query.data ?? [] };
}
