import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { diarioKeys } from '../queryKeys';
import type { ObraDiario } from '../types';

/** Obras visíveis ao usuário no módulo Diário de Obra. */
export function useObrasDiario() {
  const { empresaId } = useAuth();
  const { allowedObraIds, loading: obrasFilterLoading } = useObrasFiltered();

  const query = useQuery({
    queryKey: [...diarioKeys.obras(empresaId), allowedObraIds],
    enabled: !obrasFilterLoading,
    queryFn: async (): Promise<ObraDiario[]> => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, prazo_contratual_dias')
        .order('nome');
      if (error) throw error;
      const list = (data || []) as ObraDiario[];
      if (allowedObraIds === null) return list;
      return list.filter((o) => allowedObraIds.includes(o.id));
    },
  });

  return { ...query, obras: query.data ?? [], obrasFilterLoading };
}

/** Seleção de obra em estado local, resetada quando a obra deixa de estar disponível. */
export function useObraSelecionada(obras: ObraDiario[]) {
  const [selectedObra, setSelectedObra] = useState('');

  useEffect(() => {
    if (selectedObra && obras.length > 0 && !obras.some((o) => o.id === selectedObra)) {
      setSelectedObra('');
    }
  }, [obras, selectedObra]);

  return { selectedObra, setSelectedObra, obra: obras.find((o) => o.id === selectedObra) || null };
}
