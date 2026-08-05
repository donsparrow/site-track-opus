import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { financeiroKeys } from '../queryKeys';
import type { FinanceiroAnexo } from '../types';
import { useFinanceiroScope } from './useObrasFinanceiro';

export function useAnexosFinanceiro() {
  const { empresaId } = useFinanceiroScope();

  const query = useQuery({
    queryKey: financeiroKeys.anexos(empresaId),
    queryFn: async (): Promise<FinanceiroAnexo[]> => {
      const { data, error } = await supabase
        .from('financeiro_anexos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as FinanceiroAnexo[];
    },
  });

  return { ...query, anexos: query.data ?? [] };
}
