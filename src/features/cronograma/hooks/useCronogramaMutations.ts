import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { cronogramaKeys, obrasImpactoPrefixes } from '../queryKeys';
import type { Atividade } from '../types';
import type { AditivoAtividadeForm } from '../types';
import { planejarAtividadesAditivo } from '../aditivoSync';

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
    mutationFn: async ({ payload, atividades }: {
      payload: TablesInsert<'obra_aditivos'>;
      atividades: { nome_atividade: string; peso: number; data_inicio: string | null; data_fim: string | null }[];
    }) => {
      const { data: adt, error } = await supabase.from('obra_aditivos').insert(payload).select('id').single();
      if (error) throw error;
      if (atividades.length === 0) return;

      // Obter (ou criar) o cronograma da obra
      let { data: cron, error: cErr } = await supabase.from('cronograma').select('id').eq('obra_id', payload.obra_id).maybeSingle();
      if (cErr) throw cErr;
      if (!cron) {
        const { data: novo, error: nErr } = await supabase.from('cronograma').insert({ obra_id: payload.obra_id }).select('id').single();
        if (nErr) throw nErr;
        cron = novo;
      }
      const { data: ult, error: oErr } = await supabase
        .from('cronograma_atividades').select('ordem').eq('cronograma_id', cron.id)
        .order('ordem', { ascending: false }).limit(1).maybeSingle();
      if (oErr) throw oErr;
      const base = ult?.ordem ?? 0;
      const { error: aErr } = await supabase.from('cronograma_atividades').insert(
        atividades.map((a, i) => ({
           cronograma_id: cron.id,
          ordem: base + i + 1,
          nome_atividade: a.nome_atividade,
          peso: a.peso,
          data_inicio: a.data_inicio,
          data_fim: a.data_fim,
          tipo_atividade: 'aditivo',
          aditivo_id: adt.id,
          percentual_concluido: 0,
          status: 'nao_iniciado',
        })),
      );
      if (aErr) throw aErr;
    },
    onSuccess: () => {
      toast.success('Aditivo registrado');
      qc.invalidateQueries({ queryKey: cronogramaKeys.aditivos(obraId) });
      qc.invalidateQueries({ queryKey: cronogramaKeys.cronograma(obraId) });
      invalidateAtividades();
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

  const editarAditivo = useMutation({
    mutationFn: async ({ id, payload, atividades }: {
      id: string;
      payload: TablesInsert<'obra_aditivos'>;
      atividades: AditivoAtividadeForm[];
    }) => {
      const { data: existentes, error: readError } = await supabase.from('cronograma_atividades')
        .select('*').eq('aditivo_id', id);
      if (readError) throw readError;
      const plano = planejarAtividadesAditivo(id, existentes ?? [], atividades);
      const { data: aditivo, error } = await supabase.from('obra_aditivos')
        .update(payload).eq('id', id).eq('obra_id', obraId).select('id').single();
      if (error) throw error;

      for (const atividade of plano.atualizadas) {
        const { error: updateError } = await supabase.from('cronograma_atividades')
          .update(atividade.values).eq('id', atividade.id).eq('aditivo_id', aditivo.id);
        if (updateError) throw updateError;
      }
      if (plano.novas.length > 0) {
        let { data: cron, error: cronError } = await supabase.from('cronograma')
          .select('id').eq('obra_id', obraId).maybeSingle();
        if (cronError) throw cronError;
        if (!cron) {
          const { data: novo, error: createError } = await supabase.from('cronograma')
            .insert({ obra_id: obraId }).select('id').single();
          if (createError) throw createError;
          cron = novo;
        }
        const cronId = cron.id;
        const { data: ultima, error: ordemError } = await supabase.from('cronograma_atividades')
          .select('ordem').eq('cronograma_id', cronId).order('ordem', { ascending: false }).limit(1).maybeSingle();
        if (ordemError) throw ordemError;
        const { error: insertError } = await supabase.from('cronograma_atividades').insert(plano.novas.map((a, i) => ({
          cronograma_id: cronId, ordem: (ultima?.ordem ?? 0) + i + 1,
          nome_atividade: a.nome_atividade.trim(), peso: a.peso,
          data_inicio: a.data_inicio || null, data_fim: a.data_fim || null,
          tipo_atividade: 'aditivo', aditivo_id: id, percentual_concluido: 0, status: 'nao_iniciado',
        })));
        if (insertError) throw insertError;
      }
      if (plano.removidas.length > 0) {
        const { error: deleteError } = await supabase.from('cronograma_atividades')
          .delete().in('id', plano.removidas).eq('aditivo_id', id);
        if (deleteError) throw deleteError;
      }
    },
    onSuccess: () => toast.success('Aditivo atualizado'),
    onError,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: cronogramaKeys.aditivos(obraId) });
      qc.invalidateQueries({ queryKey: cronogramaKeys.cronograma(obraId) });
      qc.invalidateQueries({ queryKey: ['cronograma-atividades'] });
      invalidarImpactoObra();
    },
  });

  return { salvarAtividade, excluirAtividade, moverAtividade, criarAditivo, editarAditivo, excluirAditivo };
}
