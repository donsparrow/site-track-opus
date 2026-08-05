import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { cronogramaKeys, obrasImpactoPrefixes } from '../queryKeys';
import type { Atividade } from '../types';

interface SalvarAtividadeInput {
  id?: string;
  cronogramaId: string;
  maxOrdem: number;
  values: {
    nome_atividade: string;
    descricao: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    percentual_concluido: number;
    status: string;
    peso: number;
    tipo_atividade: string;
    observacoes: string | null;
  };
}

interface MoverAtividadeInput {
  current: { id: string; ordem: number };
  swap: { id: string; ordem: number };
}

export function useCronogramaMutations(obraId: string, cronogramaId: string | null) {
  const qc = useQueryClient();

  const invalidateAtividades = () => {
    qc.invalidateQueries({ queryKey: cronogramaKeys.atividades(cronogramaId) });
  };

  /** Invalida também obras/dashboards de outros módulos que exibem progresso da obra. */
  const invalidarImpactoObra = () => {
    Object.values(obrasImpactoPrefixes).forEach((prefix) => qc.invalidateQueries({ queryKey: prefix }));
  };

  const onError = (error: unknown) =>
    toast.error('Erro: ' + (error instanceof Error ? error.message : 'desconhecido'));

  const salvarAtividade = useMutation({
    mutationFn: async ({ id, cronogramaId: cronId, maxOrdem, values }: SalvarAtividadeInput) => {
      if (id) {
        const { error } = await supabase.from('cronograma_atividades').update(values).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cronograma_atividades').insert({
          cronograma_id: cronId,
          ordem: maxOrdem + 1,
          ...values,
        });
        if (error) throw error;
      }
    },
    onMutate: async ({ id, values }) => {
      const key = cronogramaKeys.atividades(cronogramaId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Atividade[]>(key);
      if (id) {
        qc.setQueryData<Atividade[]>(key, (old) =>
          (old ?? []).map((a) => (a.id === id ? { ...a, ...values } : a)),
        );
      }
      return { key, snapshot };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot) qc.setQueryData(context.key, context.snapshot);
      onError(error);
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.id ? 'Atividade atualizada' : 'Atividade criada');
    },
    onSettled: () => {
      invalidateAtividades();
      invalidarImpactoObra();
    },
  });

  const excluirAtividade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cronograma_atividades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atividade excluída');
      invalidateAtividades();
      invalidarImpactoObra();
    },
    onError,
  });

  const moverAtividade = useMutation({
    mutationFn: async ({ current, swap }: MoverAtividadeInput) => {
      const { error } = await supabase.from('cronograma_atividades').update({ ordem: swap.ordem }).eq('id', current.id);
      if (error) throw error;
      const { error: error2 } = await supabase.from('cronograma_atividades').update({ ordem: current.ordem }).eq('id', swap.id);
      if (error2) throw error2;
    },
    onSuccess: invalidateAtividades,
    onError,
  });

  const criarAditivo = useMutation({
    mutationFn: async (payload: TablesInsert<'obra_aditivos'>) => {
      const { error } = await supabase.from('obra_aditivos').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Aditivo registrado');
      qc.invalidateQueries({ queryKey: cronogramaKeys.aditivos(obraId) });
      invalidarImpactoObra();
    },
    onError,
  });

  const excluirAditivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('obra_aditivos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Aditivo excluído');
      qc.invalidateQueries({ queryKey: cronogramaKeys.aditivos(obraId) });
      invalidarImpactoObra();
    },
    onError,
  });

  return { salvarAtividade, excluirAtividade, moverAtividade, criarAditivo, excluirAditivo };
}
