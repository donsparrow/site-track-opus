import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { funcionariosPrefixes } from '../queryKeys';

export interface DetalheObra {
  obra_id: string | null;
  obra_texto: string | null;
  obra_nome: string;
  dias: number;
  valor: number;
}

export interface Fechamento {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_diaria_congelado: number;
  dias_integrais: number;
  dias_meio: number;
  total_vales: number;
  valor_liquido: number;
  valor_nao_alocado: number;
  detalhamento_obras: DetalheObra[] | null;
  status: string;
  created_at: string;
}

export const fechamentosKeys = {
  lista: (funcionarioId: string | null) => ['funcionario-fechamentos', funcionarioId ?? 'todos'] as const,
  prefix: ['funcionario-fechamentos'] as const,
};

export function useFechamentos(funcionarioId: string | null) {
  const query = useQuery({
    queryKey: fechamentosKeys.lista(funcionarioId),
    queryFn: async (): Promise<Fechamento[]> => {
      let q = supabase
        .from('funcionario_fechamentos')
        .select('*')
        .order('periodo_inicio', { ascending: false });
      if (funcionarioId) q = q.eq('funcionario_id', funcionarioId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Fechamento[];
    },
  });
  return { ...query, fechamentos: query.data ?? [] };
}

export interface CriarFechamentoInput {
  funcionario_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_diaria_congelado: number;
  dias_integrais: number;
  dias_meio: number;
  total_vales: number;
  valor_liquido: number;
  valor_nao_alocado: number;
  detalhamento_obras: DetalheObra[];
  parcelas?: { adiantamento_id: string; valor: number }[];
}

export function useFechamentosMutations() {
  const qc = useQueryClient();
  const { empresaId } = useAuth();

  const invalidate = () => qc.invalidateQueries({ queryKey: fechamentosKeys.prefix });

  const fechar = useMutation({
    mutationFn: async (input: CriarFechamentoInput) => {
      if (!empresaId) throw new Error('Empresa não identificada');
      const { parcelas, ...fechamento } = input;
      if (parcelas && parcelas.length > 0) {
        const linhas = parcelas.map((p) => ({
          empresa_id: empresaId,
          funcionario_id: input.funcionario_id,
          data: input.periodo_fim,
          tipo: 'desconto',
          valor: p.valor,
          descricao: 'Parcela de adiantamento (fechamento)',
          lancamento_origem_id: p.adiantamento_id,
        }));
        const { error: errPar } = await supabase.from('funcionario_lancamentos').insert(linhas);
        if (errPar) throw errPar;
      }
      const { error } = await supabase.from('funcionario_fechamentos').insert({
        ...fechamento,
        empresa_id: empresaId,
        status: 'fechado',
        detalhamento_obras: fechamento.detalhamento_obras as unknown as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Quinzena fechada e despesas lançadas no Financeiro');
      invalidate();
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.lancamentos });
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.adiantamentos });
    },
    onError: (e) => toast.error(`Erro ao fechar quinzena: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const reabrir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funcionario_fechamentos')
        .update({ status: 'reaberto' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Fechamento reaberto — o ponto do período pode ser editado'); invalidate(); },
    onError: (e) => toast.error(`Erro ao reabrir: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  return { fechar, reabrir };
}
