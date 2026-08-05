import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { financeiroKeys } from '../queryKeys';
import type { ObraOption, ReceitaComObra } from '../types';
import { useFinanceiroScope } from './useObrasFinanceiro';

interface Options {
  /** 'all' ou o id da obra selecionada no filtro. */
  filterObra: string;
  /** Obras já filtradas pelas permissões do usuário. */
  obras: ObraOption[];
  obrasReady: boolean;
}

export function useReceitas({ filterObra, obras, obrasReady }: Options) {
  const { empresaId, obrasFilterLoading } = useFinanceiroScope();
  const allowedObraIds = obras.map((o) => o.id);

  const query = useQuery({
    queryKey: [...financeiroKeys.receitas(empresaId, filterObra), allowedObraIds],
    enabled: !obrasFilterLoading && obrasReady,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ReceitaComObra[]> => {
      if (filterObra === 'all' && allowedObraIds.length === 0) return [];

      let q = supabase
        .from('receitas')
        .select('*, obras(nome)')
        .order('created_at', { ascending: false });

      if (filterObra !== 'all') q = q.eq('obra_id', filterObra);
      else q = q.in('obra_id', allowedObraIds);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ReceitaComObra[];
    },
  });

  return { ...query, receitas: query.data ?? [] };
}
