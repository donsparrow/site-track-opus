import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usuariosKeys } from '../queryKeys';
import type { ObraOption } from '../types';

export function useObrasUsuarios() {
  const query = useQuery({
    queryKey: usuariosKeys.obras,
    queryFn: async (): Promise<ObraOption[]> => {
      const { data, error } = await supabase.from('obras').select('id, nome').order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, obras: query.data ?? [] };
}
