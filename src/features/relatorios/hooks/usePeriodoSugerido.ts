import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Período sugerido para um novo relatório: primeiro e último diário
 * ainda não vinculado a nenhum relatório da obra.
 */
export function usePeriodoSugerido(obraId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['relatorio-periodo-sugerido', obraId],
    enabled: !!obraId && enabled,
    queryFn: async (): Promise<{ inicio: string; fim: string } | null> => {
      const { data, error } = await supabase
        .from('diario_obra')
        .select('data')
        .eq('obra_id', obraId)
        .is('relatorio_id', null)
        .order('data', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return { inicio: data[0].data, fim: data[data.length - 1].data };
    },
  });
}
