import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useEmpresaNome() {
  const { empresaId } = useAuth();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) {
      setNome(null);
      return;
    }
    supabase
      .from('empresas')
      .select('nome')
      .eq('id', empresaId)
      .single()
      .then(({ data }) => setNome(data?.nome || null));
  }, [empresaId]);

  return nome ?? 'Empresa não configurada';
}
