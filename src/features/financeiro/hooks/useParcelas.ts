import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { financeiroKeys } from '../queryKeys';
import type { ObraOption, Parcela, ParcelaComReceita, ParcelaRecebidaExtrato } from '../types';
import { useFinanceiroScope } from './useObrasFinanceiro';

/** Parcelas de uma receita expandida na tabela. */
export function useParcelas(receitaId: string | null) {
  const query = useQuery({
    queryKey: financeiroKeys.parcelas(receitaId),
    enabled: !!receitaId,
    queryFn: async (): Promise<Parcela[]> => {
      const { data, error } = await supabase
        .from('parcelas')
        .select('*')
        .eq('receita_id', receitaId as string)
        .order('numero_parcela');
      if (error) throw error;
      return (data || []) as Parcela[];
    },
  });

  return { ...query, parcelas: query.data ?? [] };
}

interface RecebidasOptions {
  filterObra: string;
  obras: ObraOption[];
  obrasReady: boolean;
}

/** Parcelas já recebidas, usadas no Extrato. */
export function useParcelasRecebidas({ filterObra, obras, obrasReady }: RecebidasOptions) {
  const { empresaId, obrasFilterLoading } = useFinanceiroScope();
  const allowedObraIds = obras.map((o) => o.id);

  const query = useQuery({
    queryKey: [...financeiroKeys.parcelasRecebidas(empresaId, filterObra), allowedObraIds],
    enabled: !obrasFilterLoading && obrasReady,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ParcelaRecebidaExtrato[]> => {
      if (filterObra === 'all' && allowedObraIds.length === 0) return [];

      let q = supabase
        .from('parcelas')
        .select('*, receitas(descricao, obra_id, obras(nome))')
        .eq('status', 'recebido')
        .not('data_recebimento', 'is', null)
        .order('data_recebimento', { ascending: true });

      if (filterObra !== 'all') q = q.eq('receitas.obra_id', filterObra);

      const { data, error } = await q;
      if (error) throw error;

      return ((data || []) as unknown as ParcelaComReceita[])
        .filter((p) => !!p.receitas)
        .filter((p) => filterObra === 'all' || p.receitas?.obra_id === filterObra)
        .map((p) => ({
          id: p.id,
          valor: Number(p.valor),
          data_recebimento: p.data_recebimento as string,
          receita_descricao: p.receitas?.descricao || '—',
          obra_nome: p.receitas?.obras?.nome || '—',
        }));
    },
  });

  return { ...query, parcelasRecebidas: query.data ?? [] };
}
