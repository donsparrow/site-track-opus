import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useNomeAssinante() {
  const { user, role } = useAuth();
  const isCliente = role === 'sindico' || role === 'cliente';
  return useQuery({
    queryKey: ['relatorio-assinante-nome', user?.id],
    enabled: isCliente && !!user,
    queryFn: async () => {
      if (!user) return '';
      const { data, error } = await supabase.from('profiles').select('nome').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data?.nome ?? '';
    },
  });
}