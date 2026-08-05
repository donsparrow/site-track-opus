import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { diarioKeys } from '../queryKeys';
import type { ObraDiario } from '../types';

/** Obras visíveis ao usuário para o módulo Diário de Obra. */
export function useObrasDiario() {
  const { empresaId } = useAuth() as { empresaId?: string | null };
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();

  const query = useQuery({
    queryKey: diarioKeys.obras(empresaId ?? null),
    enabled: !obrasFilterLoading,
    queryFn: async (): Promise<ObraDiario[]> => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, prazo_contratual_dias')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  const obras = useMemo(
    () => (query.data ? filterObras(query.data) : []),
    // filterObras é estável o suficiente por render; recalcula quando os dados mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data, obrasFilterLoading],
  );

  return { ...query, obras, obrasFilterLoading };
}

/** Seleção de obra persistida em estado local, com auto-reset. */
export function useObraSelecionada(obras: ObraDiario[]) {
  const [selectedObra, setSelectedObra] = useState('');

  useEffect(() => {
    if (selectedObra && !obras.some((o) => o.id === selectedObra)) setSelectedObra('');
  }, [obras, selectedObra]);

  const obra = obras.find((o) => o.id === selectedObra) || null;
  return { selectedObra, setSelectedObra, obra };
}
