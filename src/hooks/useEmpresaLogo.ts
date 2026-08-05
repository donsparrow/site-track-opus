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
      // RPC de branding: devolve apenas nome/logo, acessível a todos os papéis.
      const { data: branding } = await supabase.rpc('get_empresa_branding');
      let stored: string | null | undefined = branding?.[0]?.logo_url;
      if (!stored) {
        const { data } = await supabase
          .from('configuracoes_empresa')
          .select('logo_url')
          .eq('empresa_id', empresaId)
          .limit(1)
          .maybeSingle();
        stored = data?.logo_url;
      }
      const signed = await resolveLogoUrl(stored);
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
