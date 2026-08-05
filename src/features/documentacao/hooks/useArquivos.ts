import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { documentacaoKeys } from '../queryKeys';
import type { Arquivo } from '../types';

/** Busca os arquivos apenas da pasta atualmente aberta. */
export function useArquivos(pastaId: string | null) {
  const query = useQuery({
    queryKey: documentacaoKeys.arquivos(pastaId),
    enabled: !!pastaId,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<Arquivo[]> => {
      const { data, error } = await supabase
        .from('documentos_arquivos')
        .select('*')
        .eq('pasta_id', pastaId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Arquivo[];
    },
  });

  return { ...query, arquivos: query.data ?? [] };
}
