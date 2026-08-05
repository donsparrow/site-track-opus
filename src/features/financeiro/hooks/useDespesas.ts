import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { financeiroKeys } from '../queryKeys';
import type { DespesaComObra, ObraOption } from '../types';
import { useFinanceiroScope } from './useObrasFinanceiro';

interface Options {
  filterObra: string;
  obras: ObraOption[];
  obrasReady: boolean;
}

export function useDespesas({ filterObra, obras, obrasReady }: Options) {
  const { empresaId, obrasFilterLoading } = useFinanceiroScope();
  const allowedObraIds = obras.map((o) => o.id);

  const query = useQuery({
    queryKey: [...financeiroKeys.despesas(empresaId, filterObra), allowedObraIds],
    enabled: !obrasFilterLoading && obrasReady,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<DespesaComObra[]> => {
      if (filterObra === 'all' && allowedObraIds.length === 0) return [];

      let q = supabase
        .from('despesas')
        .select('*, obras(nome)')
        .order('data', { ascending: false });

      if (filterObra !== 'all') q = q.eq('obra_id', filterObra);
      else q = q.in('obra_id', allowedObraIds);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as DespesaComObra[];
    },
  });

  return { ...query, despesas: query.data ?? [] };
}
