import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { diarioKeys } from '../queryKeys';
import { cronogramaStatus, mapLegacyStatus, percentualToStatus, totalDiasParalisacao } from '../utils';
import type { DiarioDetalhado, DiarioFormValues } from '../types';
import { uploadAnexoComProgresso } from '../upload';

interface Options {
  obraId: string;
  diarioId: string | null;
}

/** Todas as escritas do módulo Diário de Obra. Nenhuma página deve chamar o supabase diretamente. */
export function useDiarioMutations({ obraId, diarioId }: Options) {
  const qc = useQueryClient();

  const invalidateDetail = () => qc.invalidateQueries({ queryKey: diarioKeys.diario(diarioId) });
  const invalidateLista = () => qc.invalidateQueries({ queryKey: diarioKeys.diarios(obraId) });
  const invalidateCronograma = () =>
    qc.invalidateQueries({ queryKey: diarioKeys.cronogramaAtividades(obraId) });

  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : 'Erro inesperado');

  /* ---------------- Diário ---------------- */

  /** Copia equipe e atividades do diário anterior para o recém-criado. */
  const inheritFromLastDiary = async (newDiarioId: string) => {
    const { data: lastDiarios } = await supabase
      .from('diario_obra')
      .select('id')
      .eq('obra_id', obraId)
      .neq('id', newDiarioId)
      .order('data', { ascending: false })
      .limit(1);

    const lastId = lastDiarios?.[0]?.id;
    if (!lastId) return;

    const [eqRes, atRes] = await Promise.all([
      supabase
        .from('diario_equipe')
        .select('nome_funcionario, funcao, horas_trabalhadas')
        .eq('diario_id', lastId),
      supabase
        .from('diario_atividades')
        .select('descricao, status, percentual, cronograma_atividade_id')
        .eq('diario_id', lastId),
    ]);

    if (eqRes.data?.length) {
      await supabase
        .from('diario_equipe')
        .insert(eqRes.data.map((e) => ({ ...e, diario_id: newDiarioId })));
    }
    if (atRes.data?.length) {
      await supabase.from('diario_atividades').insert(
        atRes.data.map((a) => ({
          diario_id: newDiarioId,
          descricao: a.descricao,
          status: mapLegacyStatus(a.status),
          percentual: a.percentual || 0,
          cronograma_atividade_id: a.cronograma_atividade_id ?? null,
        })),
      );
    }
  };

  const criarDiario = useMutation({
    mutationFn: async (values: DiarioFormValues) => {
      const { data, error } = await supabase
        .from('diario_obra')
        .insert({
          obra_id: obraId,
          data: values.data,
          clima: values.clima,
          temperatura: values.temperatura || null,
          horario_inicio: values.horario_inicio || null,
          horario_fim: values.horario_fim || null,
          observacoes_gerais: values.observacoes_gerais || null,
        })
        .select()
        .single();
      if (error) throw error;
      await inheritFromLastDiary(data.id);
      return data;
    },
    onSuccess: () => {
      toast.success('Diário criado com dados do último registro!');
      invalidateLista();
    },
    onError: fail,
  });

  const atualizarCabecalho = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: DiarioFormValues }) => {
      const { error } = await supabase
        .from('diario_obra')
        .update({
          data: values.data,
          clima: values.clima,
          temperatura: values.temperatura || null,
          horario_inicio: values.horario_inicio || null,
          horario_fim: values.horario_fim || null,
          observacoes_gerais: values.observacoes_gerais || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Diário atualizado!');
      invalidateLista();
      invalidateDetail();
    },
    onError: fail,
  });

  const excluirDiario = useMutation({
    mutationFn: async (id: string) => {
      await Promise.all([
        supabase.from('diario_equipe').delete().eq('diario_id', id),
        supabase.from('diario_atividades').delete().eq('diario_id', id),
        supabase.from('diario_materiais').delete().eq('diario_id', id),
        supabase.from('diario_ocorrencias').delete().eq('diario_id', id),
        supabase.from('diario_imagens').delete().eq('diario_id', id),
        supabase.from('diario_paralisacoes').delete().eq('diario_id', id),
      ]);
      const { error } = await supabase.from('diario_obra').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Diário excluído!');
      invalidateLista();
    },
    onError: fail,
  });

  const atualizarPrazoContratual = useMutation({
    mutationFn: async (dias: number) => {
      const { error } = await supabase
        .from('obras')
        .update({ prazo_contratual_dias: dias })
        .eq('id', obraId);
      if (error) throw error;
      return dias;
    },
    onSuccess: (dias) => {
      toast.success(`Prazo contratual atualizado: ${dias} dias`);
      qc.invalidateQueries({ queryKey: ['obras-diario'] });
      qc.invalidateQueries({ queryKey: ['obra-prazo-cronograma', obraId] });
    },
    onError: fail,
  });

  /* ---------------- Equipe ---------------- */

  const adicionarEquipe = useMutation({
    mutationFn: async (v: { nome: string; funcao: string; horas: string }) => {
      const { error } = await supabase.from('diario_equipe').insert({
        diario_id: diarioId!,
        nome_funcionario: v.nome,
        funcao: v.funcao || null,
        horas_trabalhadas: parseFloat(v.horas) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Adicionado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const atualizarEquipe = useMutation({
    mutationFn: async (v: { id: string; nome: string; funcao: string; horas: string }) => {
      const { error } = await supabase
        .from('diario_equipe')
        .update({
          nome_funcionario: v.nome,
          funcao: v.funcao || null,
          horas_trabalhadas: parseFloat(v.horas) || 0,
        })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atualizado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const excluirEquipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('diario_equipe').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido!');
      invalidateDetail();
    },
    onError: fail,
  });

  /* ---------------- Atividades ---------------- */

  const syncCronograma = async (cronAtivId: string, percentual: number) => {
    await supabase
      .from('cronograma_atividades')
      .update({ percentual_concluido: Math.round(percentual), status: cronogramaStatus(percentual) })
      .eq('id', cronAtivId);
  };

  const adicionarAtividade = useMutation({
    mutationFn: async (v: { descricao: string; percentual: number; cronogramaAtividadeId: string | null }) => {
      const { error } = await supabase.from('diario_atividades').insert({
        diario_id: diarioId!,
        descricao: v.descricao,
        status: percentualToStatus(v.percentual),
        percentual: v.percentual,
        cronograma_atividade_id: v.cronogramaAtividadeId || null,
      });
      if (error) throw error;
      if (v.cronogramaAtividadeId) await syncCronograma(v.cronogramaAtividadeId, v.percentual);
    },
    onSuccess: () => {
      toast.success('Adicionado!');
      invalidateDetail();
      invalidateCronograma();
    },
    onError: fail,
  });

  const atualizarAtividade = useMutation({
    mutationFn: async (v: {
      id: string;
      descricao: string;
      percentual: number;
      cronogramaAtividadeId: string | null;
      silent?: boolean;
    }) => {
      const { error } = await supabase
        .from('diario_atividades')
        .update({
          descricao: v.descricao,
          status: percentualToStatus(v.percentual),
          percentual: v.percentual,
          cronograma_atividade_id: v.cronogramaAtividadeId || null,
        })
        .eq('id', v.id);
      if (error) throw error;
      if (v.cronogramaAtividadeId) await syncCronograma(v.cronogramaAtividadeId, v.percentual);
      return v;
    },
    // Update otimista do percentual no cache do detalhe
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: diarioKeys.diario(diarioId) });
      const previous = qc.getQueryData<DiarioDetalhado>(diarioKeys.diario(diarioId));
      if (previous) {
        qc.setQueryData<DiarioDetalhado>(diarioKeys.diario(diarioId), {
          ...previous,
          diario_atividades: previous.diario_atividades.map((a) =>
            a.id === v.id
              ? { ...a, descricao: v.descricao, percentual: v.percentual, status: percentualToStatus(v.percentual) }
              : a,
          ),
        });
      }
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(diarioKeys.diario(diarioId), ctx.previous);
      fail(e);
    },
    onSuccess: (v) => {
      if (!v.silent) toast.success('Atividade atualizada!');
      invalidateCronograma();
    },
    onSettled: () => invalidateDetail(),
  });

  const excluirAtividade = useMutation({
    mutationFn: async (id: string) => {
      // Guarda o vínculo antes de apagar para poder recalcular o cronograma
      const { data: alvo } = await supabase
        .from('diario_atividades')
        .select('cronograma_atividade_id')
        .eq('id', id)
        .maybeSingle();
      const cronAtivId = alvo?.cronograma_atividade_id ?? null;

      const { error } = await supabase.from('diario_atividades').delete().eq('id', id);
      if (error) throw error;

      if (!cronAtivId) return { recalculado: false, semLancamento: false };

      // Lançamento restante mais recente POR DATA DO DIÁRIO
      const { data: restantes } = await supabase
        .from('diario_atividades')
        .select('percentual, diario_obra!inner(data)')
        .eq('cronograma_atividade_id', cronAtivId);

      const maisRecente = (restantes ?? [])
        .slice()
        .sort((a, b) =>
          String((b as { diario_obra: { data: string } }).diario_obra.data).localeCompare(
            String((a as { diario_obra: { data: string } }).diario_obra.data),
          ),
        )[0];

      if (!maisRecente) {
        // NÃO zera: o valor pode vir de edição manual no Cronograma.
        console.warn(
          `[cronograma] Atividade ${cronAtivId} ficou sem lançamentos no diário. Percentual mantido (possível edição manual).`,
        );
        return { recalculado: false, semLancamento: true };
      }

      await syncCronograma(cronAtivId, maisRecente.percentual || 0);
      return { recalculado: true, semLancamento: false };
    },
    onSuccess: (r) => {
      toast.success('Atividade removida!');
      if (r?.semLancamento) {
        toast.warning(
          'Sem lançamentos restantes para este serviço: o percentual do cronograma foi mantido e deve ser ajustado manualmente, se necessário.',
        );
      }
      invalidateDetail();
      invalidateCronograma();
    },
    onError: fail,
  });


  /* ---------------- Materiais ---------------- */

  const adicionarMaterial = useMutation({
    mutationFn: async (v: { material: string; quantidade: string; unidade: string }) => {
      const { error } = await supabase.from('diario_materiais').insert({
        diario_id: diarioId!,
        material: v.material,
        quantidade: parseFloat(v.quantidade) || 0,
        unidade: v.unidade,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Adicionado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const atualizarMaterial = useMutation({
    mutationFn: async (v: { id: string; material: string; quantidade: string; unidade: string }) => {
      const { error } = await supabase
        .from('diario_materiais')
        .update({ material: v.material, quantidade: parseFloat(v.quantidade) || 0, unidade: v.unidade })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atualizado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const excluirMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('diario_materiais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido!');
      invalidateDetail();
    },
    onError: fail,
  });

  /* ---------------- Ocorrências ---------------- */

  const adicionarOcorrencia = useMutation({
    mutationFn: async (v: { descricao: string; impacto: string }) => {
      const { error } = await supabase
        .from('diario_ocorrencias')
        .insert({ diario_id: diarioId!, descricao: v.descricao, impacto: v.impacto });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Adicionado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const atualizarOcorrencia = useMutation({
    mutationFn: async (v: { id: string; descricao: string; impacto: string }) => {
      const { error } = await supabase
        .from('diario_ocorrencias')
        .update({ descricao: v.descricao, impacto: v.impacto })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atualizado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const excluirOcorrencia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('diario_ocorrencias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido!');
      invalidateDetail();
    },
    onError: fail,
  });

  /* ---------------- Paralisações ---------------- */

  const adicionarParalisacao = useMutation({
    mutationFn: async (v: { motivo: string; dataInicio: string; dataFim: string }) => {
      const { error } = await supabase.from('diario_paralisacoes').insert({
        diario_id: diarioId!,
        motivo: v.motivo,
        data_inicio: v.dataInicio,
        data_fim: v.dataFim || null,
        total_dias: totalDiasParalisacao(v.dataInicio, v.dataFim),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Adicionado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const atualizarParalisacao = useMutation({
    mutationFn: async (v: { id: string; motivo: string; dataInicio: string; dataFim: string }) => {
      const { error } = await supabase
        .from('diario_paralisacoes')
        .update({
          motivo: v.motivo,
          data_inicio: v.dataInicio,
          data_fim: v.dataFim || null,
          total_dias: totalDiasParalisacao(v.dataInicio, v.dataFim),
        })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atualizado!');
      invalidateDetail();
    },
    onError: fail,
  });

  const excluirParalisacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('diario_paralisacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido!');
      invalidateDetail();
    },
    onError: fail,
  });

  /* ---------------- Imagens ---------------- */

  const enviarImagem = useMutation({
    mutationFn: async (v: { file: File; descricao: string; onProgress?: (p: number) => void }) => {
      const ext = v.file.name.split('.').pop();
      const filePath = `diarios/${diarioId}/${Date.now()}.${ext}`;
      await uploadAnexoComProgresso(filePath, v.file, v.onProgress);
      const { error } = await supabase
        .from('diario_imagens')
        .insert({ diario_id: diarioId!, url: filePath, descricao: v.descricao || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Imagem enviada!');
      invalidateDetail();
    },
    onError: fail,
  });

  const atualizarLegendaImagem = useMutation({
    mutationFn: async (v: { id: string; descricao: string }) => {
      const { error } = await supabase
        .from('diario_imagens')
        .update({ descricao: v.descricao })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Legenda atualizada');
      invalidateDetail();
    },
    onError: fail,
  });

  const excluirImagem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('diario_imagens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido!');
      invalidateDetail();
    },
    onError: fail,
  });

  return {
    criarDiario,
    atualizarCabecalho,
    excluirDiario,
    atualizarPrazoContratual,
    adicionarEquipe,
    atualizarEquipe,
    excluirEquipe,
    adicionarAtividade,
    atualizarAtividade,
    excluirAtividade,
    adicionarMaterial,
    atualizarMaterial,
    excluirMaterial,
    adicionarOcorrencia,
    atualizarOcorrencia,
    excluirOcorrencia,
    adicionarParalisacao,
    atualizarParalisacao,
    excluirParalisacao,
    enviarImagem,
    atualizarLegendaImagem,
    excluirImagem,
  };
}

export type DiarioMutations = ReturnType<typeof useDiarioMutations>;
