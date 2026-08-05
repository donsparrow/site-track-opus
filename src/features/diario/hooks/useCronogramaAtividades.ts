import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { diarioKeys } from '../queryKeys';
import type { CronogramaAtividadeOption } from '../types';

/** Atividades do cronograma da obra, usadas para vincular execução no diário. */
export function useCronogramaAtividades(obraId: string) {
  const query = useQuery({
    queryKey: diarioKeys.cronogramaAtividades(obraId),
    enabled: !!obraId,
    queryFn: async (): Promise<CronogramaAtividadeOption[]> => {
      const { data: cron, error: cronErr } = await supabase
        .from('cronograma')
        .select('id')
        .eq('obra_id', obraId)
        .maybeSingle();
      if (cronErr) throw cronErr;
      if (!cron) return [];

      const { data, error } = await supabase
        .from('cronograma_atividades')
        .select('id, nome_atividade, percentual_concluido, peso')
        .eq('cronograma_id', cron.id)
        .order('ordem');
      if (error) throw error;
      return (data || []) as CronogramaAtividadeOption[];
    },
  });

  return { ...query, cronogramaAtividades: query.data ?? [] };
}
