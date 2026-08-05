import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ferramentasPrefixes } from '../queryKeys';
import { financeiroPrefixes } from '@/features/financeiro/queryKeys';
import { STATUS_CONFIG, type Ferramenta, type FerramentaFormValues, type ObraOption } from '../types';

interface SalvarFerramentaInput {
  editId: string | null;
  values: FerramentaFormValues;
  ferramentas: Ferramenta[];
  obras: ObraOption[];
}

interface AlterarStatusInput {
  ferramenta: Ferramenta;
  novoStatus: string;
}

interface AlterarObraInput {
  ferramenta: Ferramenta;
  novaObraId: string | null;
  obras: ObraOption[];
  empresaId: string | null;
}

interface RegistrarManutencaoInput {
  ferramenta: Ferramenta;
  data: string;
  valor: string;
  local: string;
  anexo: File | null;
  empresaId: string | null;
}

export function useFerramentasMutations() {
  const qc = useQueryClient();

  const invalidateListas = () => {
    qc.invalidateQueries({ queryKey: ferramentasPrefixes.ferramentas });
    qc.invalidateQueries({ queryKey: ferramentasPrefixes.historico });
  };

  const invalidateFinanceiro = () => {
    qc.invalidateQueries({ queryKey: financeiroPrefixes.despesas });
  };

  /* ---------------- CADASTRO ---------------- */

  const salvarFerramenta = useMutation({
    mutationFn: async ({ editId, values, ferramentas, obras }: SalvarFerramentaInput) => {
      const realObraId = values.obraId && values.obraId !== 'nenhuma' ? values.obraId : null;

      const payload = {
        nome: values.nome.trim(),
        numero_cadastro: values.numeroCadastro.trim(),
        tipo: values.tipo,
        status: values.status,
        obra_id: realObraId,
        voltagem: values.tipo === 'eletrica' ? values.voltagem : null,
      };

      if (editId) {
        const old = ferramentas.find((f) => f.id === editId);
        const { error } = await supabase.from('ferramentas').update(payload).eq('id', editId);
        if (error) throw error;

        if (old && old.obra_id !== (values.obraId || null)) {
          const obraNome = obras.find((o) => o.id === values.obraId)?.nome || 'Sem obra';
          await supabase.from('ferramentas_historico').insert({
            ferramenta_id: editId,
            tipo_evento: 'movimentacao',
            descricao: `Movida para: ${obraNome}`,
            obra_id: realObraId,
          });
        }
        if (old && old.status !== values.status) {
          await supabase.from('ferramentas_historico').insert({
            ferramenta_id: editId,
            tipo_evento: 'status',
            descricao: `Status alterado: ${STATUS_CONFIG[old.status]?.label} → ${STATUS_CONFIG[values.status]?.label}`,
            obra_id: realObraId,
          });
        }
        return { editado: true };
      }

      const { error } = await supabase.from('ferramentas').insert(payload);
      if (error) throw error;
      return { editado: false };
    },
    onSuccess: ({ editado }) => {
      toast.success(editado ? 'Ferramenta atualizada' : 'Ferramenta cadastrada');
      invalidateListas();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'desconhecido';
      if (message.includes('unique') || message.includes('duplicate')) {
        toast.error('Número de cadastro já existe');
      } else {
        toast.error('Erro ao salvar: ' + message);
      }
    },
  });

  /* ---------------- EXCLUSÃO ---------------- */

  const excluirFerramenta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ferramentas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ferramenta excluída');
      invalidateListas();
    },
    onError: (error: unknown) =>
      toast.error('Erro ao excluir: ' + (error instanceof Error ? error.message : 'desconhecido')),
  });

  /* ---------------- STATUS INLINE ---------------- */

  const alterarStatus = useMutation({
    mutationFn: async ({ ferramenta, novoStatus }: AlterarStatusInput) => {
      const old = ferramenta.status;
      if (novoStatus === old) return;
      const { error } = await supabase.from('ferramentas').update({ status: novoStatus }).eq('id', ferramenta.id);
      if (error) throw error;
      await supabase.from('ferramentas_historico').insert({
        ferramenta_id: ferramenta.id,
        tipo_evento: 'status',
        descricao: `Status alterado: ${STATUS_CONFIG[old]?.label} → ${STATUS_CONFIG[novoStatus]?.label}`,
        obra_id: ferramenta.obra_id,
      });
    },
    onSuccess: () => {
      toast.success('Status atualizado');
      invalidateListas();
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  /* ---------------- OBRA INLINE ---------------- */

  const alterarObra = useMutation({
    mutationFn: async ({ ferramenta, novaObraId, obras, empresaId }: AlterarObraInput) => {
      const oldObraId = ferramenta.obra_id;
      if (novaObraId === oldObraId) return;

      const { error } = await supabase
        .from('ferramentas')
        .update({
          obra_id: novaObraId,
          ...(novaObraId ? { status: 'em_uso' } : {}),
        })
        .eq('id', ferramenta.id);
      if (error) throw error;

      const oldObraNome = obras.find((o) => o.id === oldObraId)?.nome || 'Sem obra';
      const newObraNome = obras.find((o) => o.id === novaObraId)?.nome || 'Sem obra';
      await supabase.from('ferramentas_historico').insert({
        ferramenta_id: ferramenta.id,
        tipo_evento: 'movimentacao',
        descricao: `Movida de: ${oldObraNome} → ${newObraNome}`,
        obra_id: novaObraId,
        empresa_id: empresaId,
      });

      if (novaObraId && ferramenta.status !== 'em_uso') {
        await supabase.from('ferramentas_historico').insert({
          ferramenta_id: ferramenta.id,
          tipo_evento: 'status',
          descricao: `Status alterado: ${STATUS_CONFIG[ferramenta.status]?.label} → Em Uso (automático)`,
          obra_id: novaObraId,
          empresa_id: empresaId,
        });
      }
    },
    onSuccess: () => {
      toast.success('Obra da ferramenta atualizada com sucesso');
      invalidateListas();
    },
    onError: () => toast.error('Erro ao alterar obra'),
  });

  /* ---------------- MANUTENÇÃO ---------------- */

  const registrarManutencao = useMutation({
    mutationFn: async ({ ferramenta, data, valor, local, anexo, empresaId }: RegistrarManutencaoInput) => {
      if (!empresaId) {
        throw new Error('__EMPRESA_NAO_IDENTIFICADA__');
      }
      if (!ferramenta.obra_id) {
        throw new Error('__SEM_OBRA__');
      }

      const valorNumerico = Number(valor);
      if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
        throw new Error('__VALOR_INVALIDO__');
      }

      let anexoUrl: string | null = null;
      if (anexo) {
        const ext = anexo.name.split('.').pop();
        const path = `manutencao/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('anexos').upload(path, anexo);
        if (upErr) throw new Error('__ERRO_ANEXO__');
        anexoUrl = path;
      }

      const { data: manutencao, error } = await supabase
        .from('manutencao_ferramentas')
        .insert({
          descricao: `Manutenção - ${ferramenta.nome}`,
          valor: valorNumerico,
          data,
          loja: local || null,
          obra_id: ferramenta.obra_id,
          empresa_id: empresaId,
          numero_nota: null,
          forma_pagamento: null,
        })
        .select('id')
        .single();

      if (error || !manutencao?.id) {
        throw new Error(
          '__ERRO_MANUTENCAO__:' + (error?.message || 'ID da manutenção não retornado'),
        );
      }

      console.log('Criando despesa vinculada à manutenção:', manutencao.id);

      const { data: manutencaoVinculada, error: manutencaoLinkError } = await supabase
        .from('manutencao_ferramentas')
        .select('id, despesa_id')
        .eq('id', manutencao.id)
        .single();

      if (manutencaoLinkError || !manutencaoVinculada?.despesa_id) {
        throw new Error('__DESPESA_NAO_CONFIRMADA__');
      }

      const { data: despesaVinculada, error: despesaLinkError } = await supabase
        .from('despesas')
        .select('id, manutencao_id')
        .eq('id', manutencaoVinculada.despesa_id)
        .single();

      if (despesaLinkError || despesaVinculada?.manutencao_id !== manutencao.id) {
        throw new Error('__DESPESA_SEM_VINCULO__');
      }

      await Promise.all([
        supabase.from('ferramentas').update({ ultima_manutencao: data, status: 'manutencao' }).eq('id', ferramenta.id),
        supabase.from('ferramentas_historico').insert({
          ferramenta_id: ferramenta.id,
          tipo_evento: 'manutencao',
          descricao: `Manutenção: R$ ${valorNumerico.toFixed(2)} - ${local || 'Local não informado'}${
            anexoUrl ? ' (com anexo)' : ''
          }`,
          obra_id: ferramenta.obra_id,
          empresa_id: empresaId,
        }),
      ]);
    },
    onSuccess: () => {
      toast.success('Manutenção registrada e despesa vinculada com sucesso');
      invalidateListas();
      invalidateFinanceiro();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '';
      if (message === '__EMPRESA_NAO_IDENTIFICADA__') {
        toast.error('Empresa não identificada. Faça login novamente e tente de novo.');
      } else if (message === '__SEM_OBRA__') {
        toast.error('Ferramenta não está vinculada a nenhuma obra. Vincule antes de registrar manutenção.');
      } else if (message === '__VALOR_INVALIDO__') {
        toast.error('Informe um valor de manutenção válido');
      } else if (message === '__ERRO_ANEXO__') {
        toast.error('Erro ao enviar anexo');
      } else if (message.startsWith('__ERRO_MANUTENCAO__:')) {
        toast.error('Erro ao registrar manutenção: ' + message.replace('__ERRO_MANUTENCAO__:', ''));
      } else if (message === '__DESPESA_NAO_CONFIRMADA__') {
        toast.error('A manutenção foi criada, mas a despesa vinculada não foi confirmada.');
      } else if (message === '__DESPESA_SEM_VINCULO__') {
        toast.error('A despesa foi criada sem vínculo válido com a manutenção.');
      } else {
        toast.error('Erro ao registrar manutenção: ' + (message || 'desconhecido'));
      }
    },
  });

  return {
    salvarFerramenta,
    excluirFerramenta,
    alterarStatus,
    alterarObra,
    registrarManutencao,
  };
}
