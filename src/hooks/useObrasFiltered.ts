import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useObrasFiltered() {
  const { user, role } = useAuth();
  const [allowedObraIds, setAllowedObraIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setAllowedObraIds(null); setLoading(false); return; }

    if (role === 'admin' || role === 'super_admin') {
      setAllowedObraIds(null); // null = all obras
      setLoading(false);
      return;
    }

    // trabalhador/cliente/sindico: fetch linked obras
    const fetchLinks = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('usuario_obras')
        .select('obra_id')
        .eq('user_id', user.id);
      setAllowedObraIds((data || []).map((d: any) => d.obra_id));
      setLoading(false);
    };
    fetchLinks();
  }, [user, role]);

  const filterObras = <T extends { id: string }>(obras: T[]): T[] => {
    // While loading, return empty to prevent data leakage
    if (loading) return [];
    if (allowedObraIds === null) return obras;
    return obras.filter(o => allowedObraIds.includes(o.id));
  };

  const isObraAllowed = (obraId: string): boolean => {
    if (loading) return false;
    if (allowedObraIds === null) return true;
    return allowedObraIds.includes(obraId);
  };

  return { allowedObraIds, filterObras, isObraAllowed, loading };
}
