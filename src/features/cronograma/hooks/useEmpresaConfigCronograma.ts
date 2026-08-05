import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';
import type { EmpresaConfigPdf } from '../types';

/** Configuração da empresa usada no cabeçalho/rodapé do PDF. */
export function useEmpresaConfigCronograma() {
  const query = useQuery({
    queryKey: cronogramaKeys.empresaConfig(),
    queryFn: async (): Promise<EmpresaConfigPdf | null> => {
      const { data, error } = await supabase.from('configuracoes_empresa').select('*').limit(1).single();
      if (error) throw error;
      return data as EmpresaConfigPdf;
    },
    enabled: false,
  });

  return query;
}
