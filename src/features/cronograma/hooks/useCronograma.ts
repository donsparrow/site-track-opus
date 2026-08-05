import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';
import type { Cronograma } from '../types';

/**
 * Carrega (ou cria, quando `canEdit`) o registro de cronograma da obra.
 * Mantém a mesma regra do código original: se não existir, cria um novo.
 */
export function useCronograma(obraId: string, canEdit: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: cronogramaKeys.cronograma(obraId),
    enabled: !!obraId,
    queryFn: async (): Promise<Cronograma | null> => {
      let { data: cron, error } = await supabase.from('cronograma').select('*').eq('obra_id', obraId).maybeSingle();
      if (error) throw error;
      if (!cron && canEdit) {
        const { data: newCron, error: insErr } = await supabase
          .from('cronograma')
          .insert({ obra_id: obraId })
          .select()
          .single();
        if (insErr) throw insErr;
        cron = newCron;
      }
      return cron ?? null;
    },
  });

  const refetchCronograma = () => queryClient.invalidateQueries({ queryKey: cronogramaKeys.cronograma(obraId) });

  return { ...query, cronograma: query.data ?? null, refetchCronograma };
}
