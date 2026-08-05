import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEmpresaBranding } from '@/lib/empresaBranding';

export function useEmpresaNome() {
  const { empresaId } = useAuth();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!empresaId) {
      setNome(null);
      return;
    }
    (async () => {
      const { data } = await supabase.from('empresas').select('nome').eq('id', empresaId).maybeSingle();
      let resolved = data?.nome ?? null;
      if (!resolved) {
        const branding = await fetchEmpresaBranding();
        resolved = branding?.nome_empresa ?? null;
      }
      if (!cancelled) setNome(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  return nome ?? 'Empresa não configurada';
}
