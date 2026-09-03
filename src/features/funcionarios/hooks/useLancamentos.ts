import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { funcionariosKeys, funcionariosPrefixes } from '../queryKeys';
import type { AdiantamentoSaldo, Lancamento } from '../types';

export function useLancamentos(funcionarioId: string | null, inicio: string, fim: string) {
  const query = useQuery({
    queryKey: funcionariosKeys.lancamentos(funcionarioId, inicio, fim),
    queryFn: async (): Promise<Lancamento[]> => {
      let q = supabase
        .from('funcionario_lancamentos')
        .select('*')
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false });
      if (funcionarioId) q = q.eq('funcionario_id', funcionarioId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
  });
  return { ...query, lancamentos: query.data ?? [] };
}

export interface LancamentoFormValues {
  funcionario_id: string;
  data: string;
  tipo: string;
  valor: number;
  descricao: string;
  lancamento_origem_id?: string | null;
}

/**
 * Saldo devedor de vales/adiantamentos: soma os descontos vinculados a cada um.
 * Ignora o filtro de período (o saldo é histórico).
 */
export function useAdiantamentosEmAberto(
  funcionarioId: string | null,
  incluirQuitados = false,
) {
  const query = useQuery({
    queryKey: [...funcionariosKeys.adiantamentos(funcionarioId), incluirQuitados],
    queryFn: async (): Promise<AdiantamentoSaldo[]> => {
      let q = supabase
        .from('funcionario_lancamentos')
        .select('*')
        .in('tipo', ['vale', 'adiantamento', 'desconto'])
        .order('data', { ascending: false });
      if (funcionarioId) q = q.eq('funcionario_id', funcionarioId);
      const { data, error } = await q;
      if (error) throw error;
      const todos = (data || []) as Lancamento[];

      const descontos = todos.filter((l) => l.tipo === 'desconto' && l.lancamento_origem_id);
      const origens = todos.filter((l) => l.tipo === 'vale' || l.tipo === 'adiantamento');

      const lista = origens.map((a) => {
        const vinculados = descontos
          .filter((d) => d.lancamento_origem_id === a.id)
          .sort((x, y) => x.data.localeCompare(y.data));
        const totalDescontado = vinculados.reduce((acc, d) => acc + Number(d.valor), 0);
        const saldo = Number(a.valor) - totalDescontado;
        return {
          ...a,
          valor: Number(a.valor),
          totalDescontado,
          saldo,
          quitado: saldo <= 0.009,
          descontos: vinculados,
        } as AdiantamentoSaldo;
      });

      return incluirQuitados ? lista : lista.filter((a) => !a.quitado);
    },
  });

  return { ...query, adiantamentos: query.data ?? [] };
}

export function useLancamentosMutations() {
  const qc = useQueryClient();
  const { empresaId } = useAuth();

  const salvar = useMutation({
    mutationFn: async ({ editId, values }: { editId: string | null; values: LancamentoFormValues }) => {
      const payload = {
        funcionario_id: values.funcionario_id,
        data: values.data,
        tipo: values.tipo,
        valor: values.valor,
        descricao: values.descricao.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from('funcionario_lancamentos').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        if (!empresaId) throw new Error('Empresa não identificada');
        const { error } = await supabase
          .from('funcionario_lancamentos')
          .insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Lançamento salvo');
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.lancamentos });
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('funcionario_lancamentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lançamento excluído');
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.lancamentos });
    },
    onError: (e) => toast.error(`Erro ao excluir: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  return { salvar, excluir };
}
