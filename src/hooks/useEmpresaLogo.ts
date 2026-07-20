import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveLogoUrl } from '@/lib/logoUrl';

export function useEmpresaLogo() {
  const { empresaId } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!empresaId) {
      setLogoUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('configuracoes_empresa')
        .select('logo_url')
        .eq('empresa_id', empresaId)
        .limit(1)
        .single();
      const signed = await resolveLogoUrl(data?.logo_url);
      if (!cancelled) {
        setLogoUrl(signed);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  return { logoUrl, loading };
}
