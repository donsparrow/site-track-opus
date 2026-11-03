import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

export function useObrasFiltered() {
  const { user, role } = useAuth();
  const isPrivileged = role === 'admin' || role === 'super_admin';
  const needsQuery = !!user && !isPrivileged;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.obrasPermitidas(user?.id ?? '', role),
    enabled: needsQuery,
    queryFn: async () => {
      const { data } = await supabase
        .from('usuario_obras')
        .select('obra_id')
        .eq('user_id', user!.id);
      return (data || []).map((d: any) => d.obra_id as string);
    },
  });

  const loading = needsQuery && isLoading;
  // null = all obras (admin/super_admin ou sem usuário); array vazio em erro = nenhuma obra
  const allowedObraIds: string[] | null = needsQuery ? (data ?? []) : null;

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
