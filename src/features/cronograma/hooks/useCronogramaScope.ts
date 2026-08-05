import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';

/** Escopo compartilhado do módulo: empresa/permissões do usuário + obras acessíveis. */
export function useCronogramaScope() {
  const { canEdit, empresaId, isAdmin, isSuperAdmin } = useAuth();
  const { allowedObraIds, filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  return { canEdit, empresaId, isAdmin, isSuperAdmin, allowedObraIds, filterObras, obrasFilterLoading };
}
