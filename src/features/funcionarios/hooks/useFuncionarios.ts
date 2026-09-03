import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { funcionariosKeys, funcionariosPrefixes } from '../queryKeys';
import type { Funcionario, FuncionarioFormValues, ObraOption } from '../types';

const sanitize = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-');

export function useFuncionarios() {
  const query = useQuery({
    queryKey: funcionariosKeys.lista,
    queryFn: async (): Promise<Funcionario[]> => {
      const { data, error } = await supabase.from('funcionarios').select('*').order('nome');
      if (error) throw error;
      return (data || []) as Funcionario[];
    },
  });
  return { ...query, funcionarios: query.data ?? [] };
}

export function useObrasFuncionarios() {
  const query = useQuery({
    queryKey: funcionariosKeys.obras,
    queryFn: async (): Promise<ObraOption[]> => {
      const { data, error } = await supabase.from('obras').select('id, nome, status').order('nome');
      if (error) throw error;
      return (data || []) as ObraOption[];
    },
  });
  return { ...query, obras: query.data ?? [] };
}

export function useFuncionariosMutations() {
  const qc = useQueryClient();
  const { empresaId } = useAuth();

  const uploadFoto = async (file: File) => {
    const path = `funcionarios/${empresaId ?? 'sem-empresa'}/${crypto.randomUUID()}_${sanitize(file.name)}`;
    const { error } = await supabase.storage.from('anexos').upload(path, file);
    if (error) throw error;
    return path;
  };

  const salvar = useMutation({
    mutationFn: async ({ editId, values }: { editId: string | null; values: FuncionarioFormValues }) => {
      let foto_url: string | undefined;
      if (values.fotoFile) foto_url = await uploadFoto(values.fotoFile);

      const payload = {
        nome: values.nome.trim(),
        funcao: values.funcao.trim() || null,
        telefone: values.telefone.trim() || null,
        valor_diaria: values.valor_diaria,
        dias_padrao: values.dias_padrao,
        obra_atual_id: values.obra_atual_id,
        obra_atual_texto: values.obra_atual_id ? null : values.obra_atual_texto.trim() || null,
        ativo: values.ativo,
        ...(foto_url ? { foto_url } : {}),
      };

      if (editId) {
        const { error } = await supabase.from('funcionarios').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        if (!empresaId) throw new Error('Empresa não identificada');
        const { error } = await supabase.from('funcionarios').insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Funcionário salvo');
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.funcionarios });
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.ponto });
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const alternarAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('funcionarios').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.funcionarios });
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.ponto });
    },
    onError: (e) => toast.error(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('funcionarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Funcionário excluído');
      qc.invalidateQueries({ queryKey: funcionariosPrefixes.funcionarios });
    },
    onError: (e) => toast.error(`Erro ao excluir: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  return { salvar, alternarAtivo, excluir };
}
