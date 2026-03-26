import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useObrasFiltered() {
  const { user, role } = useAuth();
  const [allowedObraIds, setAllowedObraIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    if (role === 'admin' || role === 'trabalhador') {
      setAllowedObraIds(null); // null = all obras
      setLoading(false);
      return;
    }

    // cliente/sindico: fetch linked obras
    const fetch = async () => {
      const { data } = await supabase
        .from('usuario_obras')
        .select('obra_id')
        .eq('user_id', user.id);
      setAllowedObraIds((data || []).map((d: any) => d.obra_id));
      setLoading(false);
    };
    fetch();
  }, [user, role]);

  const filterObras = <T extends { id: string }>(obras: T[]): T[] => {
    if (allowedObraIds === null) return obras;
    return obras.filter(o => allowedObraIds.includes(o.id));
  };

  const isObraAllowed = (obraId: string): boolean => {
    if (allowedObraIds === null) return true;
    return allowedObraIds.includes(obraId);
  };

  return { allowedObraIds, filterObras, isObraAllowed, loading };
}
