import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useEmpresaLogo() {
  const { empresaId } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) {
      setLogoUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('configuracoes_empresa')
      .select('logo_url')
      .eq('empresa_id', empresaId)
      .limit(1)
      .single()
      .then(({ data }) => {
        setLogoUrl(data?.logo_url || null);
        setLoading(false);
      });
  }, [empresaId]);

  return { logoUrl, loading };
}
