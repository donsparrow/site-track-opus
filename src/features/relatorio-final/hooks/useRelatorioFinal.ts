import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { relatorioFinalKeys } from '../queryKeys';
import type { ObraOption, RelatorioFinal, RelatorioFinalFoto } from '../types';

export function useObrasRelatorioFinal() {
  const { user, role } = useAuth();
  const { filterObras, loading } = useObrasFiltered();

  const query = useQuery({
    queryKey: [...relatorioFinalKeys.obras(), user?.id, role],
    enabled: !loading,
    queryFn: async (): Promise<ObraOption[]> => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, endereco, responsavel_tecnico, data_inicio, data_fim_prevista, clientes(nome, cpf_cnpj)')
        .order('nome');
      if (error) throw error;
      return (data || []) as unknown as ObraOption[];
    },
  });

  return { ...query, isLoading: loading || query.isLoading, obras: filterObras(query.data ?? []) };
}

export function useRelatorioFinal(obraId: string | null, tipoRelatorio: string = 'entrega_obra') {
  return useQuery({
    queryKey: relatorioFinalKeys.relatorio(obraId, tipoRelatorio),
    enabled: !!obraId,
    queryFn: async (): Promise<RelatorioFinal | null> => {
      if (!obraId) return null;
      const { data, error } = await supabase
        .from('relatorios_finais')
        .select('*')
        .eq('obra_id', obraId)
        .eq('tipo_relatorio', tipoRelatorio)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRelatorioFinalFotos(relatorioId: string | null) {
  const query = useQuery({
    queryKey: relatorioFinalKeys.fotos(relatorioId),
    enabled: !!relatorioId,
    queryFn: async (): Promise<RelatorioFinalFoto[]> => {
      if (!relatorioId) return [];
      const { data, error } = await supabase
        .from('relatorio_final_fotos')
        .select('*')
        .eq('relatorio_id', relatorioId)
        .order('ordem');
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, fotos: query.data ?? [] };
}
