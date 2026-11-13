import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useCronograma } from '@/features/cronograma/hooks/useCronograma';
import { useCronogramaAtividades } from '@/features/cronograma/hooks/useCronogramaAtividades';
import { useAditivos } from '@/features/cronograma/hooks/useAditivos';
import { useObraPrazoInfo } from '@/features/cronograma/hooks/useObraPrazoInfo';
import { calcularIndicadores } from '@/features/cronograma/utils';

export const LIMITE_ABA = 20;

/** Cronograma da obra — mesmas consultas/chaves do módulo Cronograma (somente leitura, nunca cria). */
export function useCronogramaObra(obraId: string, ativo: boolean) {
  const id = ativo ? obraId : '';
  const { cronograma, isLoading: l1 } = useCronograma(id, false);
  const { atividades, isLoading: l2 } = useCronogramaAtividades(ativo ? cronograma?.id ?? null : null);
  const { aditivos } = useAditivos(id);
  const prazo = useObraPrazoInfo(id);
  const indicadores = calcularIndicadores({
    atividades, aditivos,
    prazoContratual: prazo.prazoContratual,
    primeiroDiario: prazo.primeiroDiario,
    obraStatus: prazo.obraStatus,
    ultimoDiario: prazo.ultimoDiario,
    dataFimPrevista: prazo.dataFimPrevista,
    paralisacoes: prazo.paralisacoes,
    datasDiarios: prazo.datasDiarios,
  });
  return {
    atividades, indicadores,
    isLoading: ativo && (l1 || prazo.isLoading || (!!cronograma && l2)),
  };
}

export function useDiariosObra(obraId: string, ativo: boolean) {
  return useQuery({
    queryKey: queryKeys.obraDiarios(obraId),
    enabled: ativo && !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase.from('diario_obra')
        .select('id, data, clima, horario_inicio, horario_fim, observacoes_gerais')
        .eq('obra_id', obraId).order('data', { ascending: false }).limit(LIMITE_ABA);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRelatoriosObra(obraId: string, ativo: boolean) {
  return useQuery({
    queryKey: queryKeys.obraRelatorios(obraId),
    enabled: ativo && !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase.from('relatorios')
        .select('id, data_inicio, data_fim, status, progresso_fisico, created_at')
        .eq('obra_id', obraId).neq('status', 'excluido')
        .order('created_at', { ascending: false }).limit(LIMITE_ABA);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLaudosObra(obraId: string, ativo: boolean) {
  return useQuery({
    queryKey: queryKeys.obraLaudos(obraId),
    enabled: ativo && !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase.from('relatorios_finais')
        .select('id, tipo_relatorio, data_emissao, assinatura_empresa_url, assinatura_sindico_url, updated_at')
        .eq('obra_id', obraId).order('updated_at', { ascending: false }).limit(LIMITE_ABA);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFuncionariosObra(obraId: string, ativo: boolean) {
  return useQuery({
    queryKey: queryKeys.obraFuncionarios(obraId),
    enabled: ativo && !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase.from('funcionarios')
        .select('id, nome, funcao').eq('obra_atual_id', obraId).order('nome').limit(LIMITE_ABA);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFerramentasObra(obraId: string, ativo: boolean) {
  return useQuery({
    queryKey: queryKeys.obraFerramentas(obraId),
    enabled: ativo && !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase.from('ferramentas')
        .select('id, nome, numero_cadastro, status').eq('obra_id', obraId).order('nome').limit(LIMITE_ABA);
      if (error) throw error;
      return data ?? [];
    },
  });
}
