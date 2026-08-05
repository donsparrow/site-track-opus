import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchEmpresaConfigOrBranding } from '@/lib/empresaBranding';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { relatoriosKeys } from '../queryKeys';
import type { EmpresaConfig, ObraRelatorio } from '../types';

/** Escopo compartilhado: empresa do usuário + obras que ele pode acessar. */
export function useRelatoriosScope() {
  const { empresaId, user } = useAuth();
  const { allowedObraIds, isObraAllowed, loading: obrasFilterLoading } = useObrasFiltered();
  return { empresaId, user, allowedObraIds, isObraAllowed, obrasFilterLoading };
}

export function useObrasRelatorios() {
  const { empresaId, allowedObraIds, obrasFilterLoading } = useRelatoriosScope();

  const query = useQuery({
    queryKey: [...relatoriosKeys.obras(empresaId), allowedObraIds],
    enabled: !obrasFilterLoading,
    queryFn: async (): Promise<ObraRelatorio[]> => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, data_inicio, data_fim_prevista, endereco, responsavel_tecnico, crea_cau, prazo_contratual_dias, clientes(nome, cpf_cnpj, email, telefone)')
        .order('nome');
      if (error) throw error;
      const list = (data || []) as unknown as ObraRelatorio[];
      if (allowedObraIds === null) return list;
      return list.filter((o) => allowedObraIds.includes(o.id));
    },
  });

  return { ...query, obras: query.data ?? [] };
}

export function useEmpresaConfig() {
  const { empresaId } = useRelatoriosScope();

  const query = useQuery({
    queryKey: relatoriosKeys.empresa(empresaId),
    queryFn: async (): Promise<EmpresaConfig | null> => {
      return await fetchEmpresaConfigOrBranding<EmpresaConfig>();

    },
  });

  return { ...query, empresa: query.data ?? null };
}
