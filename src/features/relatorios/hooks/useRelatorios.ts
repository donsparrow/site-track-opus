import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { relatoriosKeys } from '../queryKeys';
import type { RelatorioComObra } from '../types';
import { useRelatoriosScope } from './useObrasRelatorios';

/** Lista de relatórios visíveis (exclui soft-deleted) com filtros de obra e status. */
export function useRelatorios(filtros: { obraId?: string; status?: string } = {}) {
  const { empresaId, allowedObraIds, obrasFilterLoading } = useRelatoriosScope();

  const query = useQuery({
    queryKey: [...relatoriosKeys.lista(empresaId), allowedObraIds],
    enabled: !obrasFilterLoading,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<RelatorioComObra[]> => {
      const { data, error } = await supabase
        .from('relatorios')
        .select('*, obras(nome, clientes(nome))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []) as unknown as RelatorioComObra[];
      return list.filter((r) => {
        if (r.status === 'excluido') return false;
        if (allowedObraIds === null) return true;
        return allowedObraIds.includes(r.obra_id);
      });
    },
  });

  const relatorios = (query.data ?? []).filter((r) => {
    if (filtros.obraId && r.obra_id !== filtros.obraId) return false;
    if (filtros.status && r.status !== filtros.status) return false;
    return true;
  });

  return { ...query, relatorios };
}
