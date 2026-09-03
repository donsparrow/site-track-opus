import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { funcionariosKeys, funcionariosPrefixes } from '../queryKeys';
import type { PontoRegistro, PontoStatus } from '../types';

export function usePonto(periodoInicio: string, periodoFim: string) {
  const query = useQuery({
    queryKey: funcionariosKeys.ponto(periodoInicio, periodoFim),
    queryFn: async (): Promise<PontoRegistro[]> => {
      const { data, error } = await supabase
        .from('ponto_registros')
        .select('*')
        .gte('data', periodoInicio)
        .lte('data', periodoFim);
      if (error) throw error;
      return (data || []) as PontoRegistro[];
    },
  });
  return { ...query, registros: query.data ?? [] };
}

export interface SalvarPontoInput {
  funcionarioId: string;
  data: string;
  status: PontoStatus;
  motivo: string | null;
  obraId: string | null;
  obraTexto: string | null;
  observacao: string | null;
  registroId: string | null;
  /** Propaga a obra do dia para o cadastro do funcionário. */
  atualizarObraAtual: boolean;
}

export function usePontoMutations(periodoInicio: string, periodoFim: string) {
  const qc = useQueryClient();
  const { empresaId } = useAuth();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: funcionariosKeys.ponto(periodoInicio, periodoFim) });
    qc.invalidateQueries({ queryKey: funcionariosPrefixes.funcionarios });
  };

  const salvarPonto = useMutation({
    mutationFn: async (input: SalvarPontoInput) => {
      const payload = {
        funcionario_id: input.funcionarioId,
        data: input.data,
        status: input.status,
        motivo: input.status === 'falta' ? input.motivo : null,
        obra_id: input.status === 'falta' ? null : input.obraId,
        obra_texto: input.status === 'falta' ? null : input.obraId ? null : input.obraTexto,
        observacao: input.observacao,
      };

      if (input.registroId) {
        const { error } = await supabase.from('ponto_registros').update(payload).eq('id', input.registroId);
        if (error) throw error;
      } else {
        if (!empresaId) throw new Error('Empresa não identificada');
        const { error } = await supabase
          .from('ponto_registros')
          .insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
      }

      if (input.atualizarObraAtual && input.status !== 'falta') {
        const { error } = await supabase
          .from('funcionarios')
          .update({
            obra_atual_id: input.obraId,
            obra_atual_texto: input.obraId ? null : input.obraTexto,
          })
          .eq('id', input.funcionarioId);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Ponto atualizado'); invalidate(); },
    onError: (e) => toast.error(`Erro ao salvar ponto: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const limparPonto = useMutation({
    mutationFn: async (registroId: string) => {
      const { error } = await supabase.from('ponto_registros').delete().eq('id', registroId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Registro removido'); invalidate(); },
    onError: (e) => toast.error(`Erro ao remover: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  return { salvarPonto, limparPonto };
}
