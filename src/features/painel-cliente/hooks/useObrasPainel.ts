import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { painelKeys } from '../queryKeys';

export interface ObraPainel {
  id: string;
  nome: string;
  endereco: string | null;
  status: string;
  exibir_pagamentos_cliente: boolean;
}

/** Obras vinculadas ao usuário (síndico/cliente). */
export function useObrasPainel() {
  const { user } = useAuth();
  const { allowedObraIds, loading } = useObrasFiltered();
  const ids = allowedObraIds ?? [];
  const query = useQuery({
    queryKey: [...painelKeys.obras(user?.id ?? ''), ids],
    enabled: !!user && !loading,
    queryFn: async (): Promise<ObraPainel[]> => {
      if (allowedObraIds && ids.length === 0) return [];
      let q = supabase.from('obras').select('id, nome, endereco, status, exibir_pagamentos_cliente').order('nome');
      if (allowedObraIds) q = q.in('id', ids);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ObraPainel[];
    },
  });
  return { ...query, obras: query.data ?? [], isLoading: loading || query.isLoading };
}
