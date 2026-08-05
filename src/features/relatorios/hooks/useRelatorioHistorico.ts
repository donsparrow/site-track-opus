import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { relatoriosKeys } from '../queryKeys';
import type { RelatorioLog, RelatorioVersao } from '../types';

/**
 * Versões e logs de um relatório. Só busca quando o usuário abre o histórico
 * (`enabled`), evitando carregar junto da lista.
 */
export function useRelatorioHistorico(relatorioId: string | null, enabled: boolean) {
  const versoesQuery = useQuery({
    queryKey: relatoriosKeys.versoes(relatorioId),
    enabled: !!relatorioId && enabled,
    queryFn: async (): Promise<RelatorioVersao[]> => {
      const { data, error } = await supabase
        .from('relatorio_versoes')
        .select('*')
        .eq('relatorio_id', relatorioId!)
        .order('numero_versao', { ascending: false });
      if (error) throw error;
      return (data || []) as RelatorioVersao[];
    },
  });

  const logsQuery = useQuery({
    queryKey: relatoriosKeys.logs(relatorioId),
    enabled: !!relatorioId && enabled,
    queryFn: async (): Promise<RelatorioLog[]> => {
      const { data, error } = await supabase
        .from('relatorio_logs')
        .select('*')
        .eq('relatorio_id', relatorioId!)
        .order('data', { ascending: false });
      if (error) throw error;
      return (data || []) as RelatorioLog[];
    },
  });

  const versoes = versoesQuery.data ?? [];
  const autorIds = Array.from(new Set(versoes.map((v) => v.criado_por).filter(Boolean)));

  const nomesQuery = useQuery({
    queryKey: ['relatorio-autores', autorIds.join(',')],
    enabled: autorIds.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nome, email')
        .in('user_id', autorIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((p) => { map[p.user_id] = p.nome || p.email || 'Usuário'; });
      return map;
    },
  });

  return {
    versoes,
    logs: logsQuery.data ?? [],
    nomesUsuarios: nomesQuery.data ?? {},
    isPending: versoesQuery.isPending,
    isError: versoesQuery.isError,
    refetch: () => { versoesQuery.refetch(); logsQuery.refetch(); },
  };
}
