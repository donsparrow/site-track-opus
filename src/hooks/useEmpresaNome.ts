import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEmpresaBranding } from '@/lib/empresaBranding';
import { queryKeys } from '@/lib/queryKeys';

export function useEmpresaNome() {
  const { empresaId } = useAuth();

  const { data: nome } = useQuery({
    queryKey: queryKeys.empresaNome(empresaId ?? ''),
    enabled: !!empresaId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.from('empresas').select('nome').eq('id', empresaId!).maybeSingle();
      let resolved = data?.nome ?? null;
      if (!resolved) {
        const branding = await fetchEmpresaBranding();
        resolved = branding?.nome_empresa ?? null;
      }
      return resolved;
    },
  });

  return nome ?? 'Empresa não configurada';
}
