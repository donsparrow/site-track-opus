import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { relatorioFinalKeys } from '../queryKeys';
import { useObrasRelatorioFinal } from './useRelatorioFinal';
import type { RelatorioFinal } from '../types';
export type LaudoLista = Pick<RelatorioFinal, 'id' | 'obra_id' | 'tipo_relatorio' | 'status' | 'cliente_nome' | 'updated_at' | 'assinatura_empresa_url' | 'assinatura_empresa_data' | 'assinatura_sindico_url' | 'assinatura_sindico_data' | 'data_conclusao' | 'data_vistoria'> & { obraNome: string };
export function useLaudosLista() {
  const { user, role } = useAuth();
  const obrasQuery = useObrasRelatorioFinal();
  const query = useQuery({
    queryKey: relatorioFinalKeys.lista(user?.id, role), enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('relatorios_finais')
        .select('id, obra_id, tipo_relatorio, status, cliente_nome, updated_at, assinatura_empresa_url, assinatura_empresa_data, assinatura_sindico_url, assinatura_sindico_data, data_conclusao, data_vistoria')
        .order('updated_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const laudos = useMemo(() => {
    const obras = new Map(obrasQuery.obras.map(o => [o.id, o.nome]));
    return (query.data ?? []).flatMap(r => {
      const obraNome = obras.get(r.obra_id);
      return obraNome ? [{ ...r, obraNome }] : [];
    });
  }, [query.data, obrasQuery.obras]);
  return { laudos, obras: obrasQuery.obras, isLoading: query.isLoading || obrasQuery.isLoading, error: query.error || obrasQuery.error };
}