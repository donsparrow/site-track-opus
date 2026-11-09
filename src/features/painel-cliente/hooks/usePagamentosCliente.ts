import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { painelKeys } from '../queryKeys';

export interface PagamentoCliente {
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
}

/** Parcelas da obra via função protegida (vazia se a chave estiver desligada). */
export function usePagamentosCliente(obraId: string, enabled: boolean) {
  return useQuery({
    queryKey: painelKeys.pagamentos(obraId),
    enabled: !!obraId && enabled,
    queryFn: async (): Promise<PagamentoCliente[]> => {
      const { data, error } = await supabase.rpc('pagamentos_cliente_obra', { _obra_id: obraId });
      if (error) throw error;
      return (data ?? []) as PagamentoCliente[];
    },
  });
}
