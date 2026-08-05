import { useQuery } from '@tanstack/react-query';
import { fetchEmpresaConfigOrBranding } from '@/lib/empresaBranding';
import { cronogramaKeys } from '../queryKeys';
import type { EmpresaConfigPdf } from '../types';

/** Configuração da empresa usada no cabeçalho/rodapé do PDF. */
export function useEmpresaConfigCronograma() {
  const query = useQuery({
    queryKey: cronogramaKeys.empresaConfig(),
    queryFn: async (): Promise<EmpresaConfigPdf | null> => {
      return await fetchEmpresaConfigOrBranding<EmpresaConfigPdf>();
    },

    enabled: false,
  });

  return query;
}
