import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { financeiroPrefixes } from '../queryKeys';
import type { DespesaComObra, Parcela, TipoRegistroAnexo } from '../types';

interface EditarReceitaInput {
  id: string;
  descricao: string;
  valor_total: number;
  observacoes: string | null;
}

interface EditarParcelaInput {
  id: string;
  receita_id: string;
  valor: number;
  data_vencimento: string;
  forma_pagamento: string | null;
}

interface ReceberParcelaInput {
  parcelaId: string;
  receitaId: string;
  formaPagamento: string;
}

interface EditarDespesaInput {
  original: DespesaComObra;
  valor: number;
  descricao: string;
  data: string;
  tipo: string;
  forma_pagamento: string | null;
  tipo_pagamento: string;
  data_vencimento: string | null;
}

interface UploadAnexosInput {
  registroId: string;
  tipoRegistro: TipoRegistroAnexo;
  tipoAnexo: string;
  files: File[];
}

export function useFinanceiroMutations() {
  const qc = useQueryClient();

  const invalidate = (prefixes: readonly (readonly string[])[]) => {
    prefixes.forEach((p) => qc.invalidateQueries({ queryKey: p }));
  };

  const invalidateListas = () =>
    invalidate([
      financeiroPrefixes.receitas,
      financeiroPrefixes.despesas,
      financeiroPrefixes.parcelas,
      financeiroPrefixes.parcelasRecebidas,
    ]);

  const onError = (error: unknown) =>
    toast.error('Erro: ' + (error instanceof Error ? error.message : 'desconhecido'));

  /* ---------------- RECEITAS ---------------- */

  const criarReceita = useMutation({
    mutationFn: async (payload: TablesInsert<'receitas'>) => {
      const { error } = await supabase.from('receitas').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Receita criada! Parcelas geradas automaticamente.');
      invalidateListas();
    },
    onError,
  });

  const editarReceita = useMutation({
    mutationFn: async ({ id, ...values }: EditarReceitaInput) => {
      const { error } = await supabase.from('receitas').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Receita atualizada com sucesso!');
      invalidateListas();
    },
    onError,
  });

  const excluirReceita = useMutation({
    mutationFn: async (receitaId: string) => {
      const { error: pErr } = await supabase.from('parcelas').delete().eq('receita_id', receitaId);
      if (pErr) throw pErr;
      const { error } = await supabase.from('receitas').delete().eq('id', receitaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Receita e parcelas excluídas com sucesso!');
      invalidateListas();
    },
    onError,
  });

  /* ---------------- PARCELAS ---------------- */

  const editarParcela = useMutation({
    mutationFn: async ({ id, valor, data_vencimento, forma_pagamento }: EditarParcelaInput) => {
      const { error } = await supabase
        .from('parcelas')
        .update({ valor, data_vencimento, forma_pagamento })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Parcela atualizada com sucesso!');
      invalidateListas();
    },
    onError,
  });

  const excluirParcela = useMutation({
    mutationFn: async ({ id }: { id: string; receitaId: string | null }) => {
      const { error } = await supabase.from('parcelas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Parcela excluída com sucesso!');
      invalidateListas();
    },
    onError,
  });

  /** Atualização otimista: a parcela aparece como recebida antes da resposta. */
  const receberParcela = useMutation({
    mutationFn: async ({ parcelaId, formaPagamento }: ReceberParcelaInput) => {
      const { error } = await supabase
        .from('parcelas')
        .update({
          data_recebimento: new Date().toISOString().split('T')[0],
          status: 'recebido',
          forma_pagamento: formaPagamento,
        })
        .eq('id', parcelaId);
      if (error) throw error;
    },
    onMutate: async ({ parcelaId, receitaId, formaPagamento }: ReceberParcelaInput) => {
      const key = ['parcelas', receitaId];
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Parcela[]>(key);
      qc.setQueryData<Parcela[]>(key, (old) =>
        (old ?? []).map((p) =>
          p.id === parcelaId
            ? {
                ...p,
                status: 'recebido',
                forma_pagamento: formaPagamento,
                data_recebimento: new Date().toISOString().split('T')[0],
              }
            : p,
        ),
      );
      return { key, snapshot };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot) qc.setQueryData(context.key, context.snapshot);
      onError(error);
    },
    onSuccess: () => {
      toast.success('Parcela marcada como recebida!');
    },
    onSettled: () => invalidateListas(),
  });

  /* ---------------- DESPESAS ---------------- */

  const criarDespesa = useMutation({
    mutationFn: async (payload: TablesInsert<'despesas'>) => {
      const { error } = await supabase.from('despesas').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Despesa registrada!');
      invalidateListas();
    },
    onError,
  });

  const editarDespesa = useMutation({
    mutationFn: async (input: EditarDespesaInput) => {
      const { original, ...values } = input;
      const { error } = await supabase.from('despesas').update(values).eq('id', original.id);
      if (error) throw error;

      // Sincroniza de volta com manutenção de ferramentas quando vinculada.
      if (!original.manutencao_id) return;

      const oldValor = Number(original.valor);
      const newValor = values.valor;
      const oldData = original.data;
      const newData = values.data;
      const oldDescricao = original.descricao;
      const newDescricao = values.descricao;

      const hasChanges =
        oldValor !== newValor || oldData !== newData || oldDescricao !== newDescricao;
      if (!hasChanges) return;

      await supabase
        .from('manutencao_ferramentas')
        .update({
          valor: newValor,
          data: newData,
          descricao: newDescricao,
          forma_pagamento: values.forma_pagamento,
        })
        .eq('id', original.manutencao_id);

      const { data: manutData } = await supabase
        .from('manutencao_ferramentas')
        .select('id, obra_id, empresa_id')
        .eq('id', original.manutencao_id)
        .single();

      if (!manutData) return;

      const { data: histEntry } = await supabase
        .from('ferramentas_historico')
        .select('ferramenta_id')
        .eq('tipo_evento', 'manutencao')
        .eq('obra_id', manutData.obra_id as string)
        .eq('empresa_id', manutData.empresa_id as string)
        .order('created_at', { ascending: false })
        .limit(1);

      const ferramentaId = histEntry?.[0]?.ferramenta_id;

      const changes: string[] = [];
      if (oldValor !== newValor)
        changes.push(`Valor: R$ ${oldValor.toFixed(2)} → R$ ${newValor.toFixed(2)}`);
      if (oldData !== newData)
        changes.push(
          `Data: ${new Date(oldData + 'T00:00:00').toLocaleDateString('pt-BR')} → ${new Date(
            newData + 'T00:00:00',
          ).toLocaleDateString('pt-BR')}`,
        );
      if (oldDescricao !== newDescricao) changes.push('Descrição alterada');

      if (ferramentaId && changes.length > 0) {
        await supabase.from('ferramentas_historico').insert({
          ferramenta_id: ferramentaId,
          tipo_evento: 'manutencao',
          descricao: `Manutenção atualizada via financeiro: ${changes.join('; ')}`,
          obra_id: manutData.obra_id,
          empresa_id: manutData.empresa_id,
        });
      }
    },
    onSuccess: () => {
      toast.success('Despesa atualizada com sucesso!');
      invalidateListas();
    },
    onError,
  });

  const excluirDespesa = useMutation({
    mutationFn: async (despesaId: string) => {
      const { error } = await supabase.from('despesas').delete().eq('id', despesaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Despesa excluída com sucesso!');
      invalidateListas();
    },
    onError,
  });

  /* ---------------- ANEXOS ---------------- */

  const uploadAnexos = useMutation({
    mutationFn: async ({ registroId, tipoRegistro, tipoAnexo, files }: UploadAnexosInput) => {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `financeiro/${tipoRegistro}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('anexos').upload(path, file);
        if (upErr) {
          toast.error('Erro ao enviar ' + file.name + ': ' + upErr.message);
          continue;
        }
        const { error } = await supabase.from('financeiro_anexos').insert({
          tipo_registro: tipoRegistro,
          registro_id: registroId,
          tipo_anexo: tipoAnexo,
          nome_arquivo: file.name,
          url_arquivo: path,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Arquivo(s) anexado(s) com sucesso!');
      invalidate([financeiroPrefixes.anexos]);
    },
    onError,
  });

  return {
    criarReceita,
    editarReceita,
    excluirReceita,
    editarParcela,
    excluirParcela,
    receberParcela,
    criarDespesa,
    editarDespesa,
    excluirDespesa,
    uploadAnexos,
  };
}
