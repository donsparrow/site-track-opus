import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Modulo } from '@/hooks/usePermissions';

export interface AcoesModulo {
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  loading: boolean;
}

/**
 * Ações de escrita permitidas em um módulo.
 * admin/super_admin: tudo; trabalhador: permissoes_usuario; síndico/cliente: nada.
 * Enquanto carrega, tudo falso.
 */
export function useAcoesModulo(modulo: Modulo): AcoesModulo {
  const { role, isAdmin, isSuperAdmin, loading: authLoading } = useAuth() as ReturnType<typeof useAuth> & { loading?: boolean };
  const { pode, loading: permLoading } = usePermissions();
  const loading = !!authLoading || permLoading;
  if (loading) return { podeCriar: false, podeEditar: false, podeExcluir: false, loading };
  if (isAdmin || isSuperAdmin) return { podeCriar: true, podeEditar: true, podeExcluir: true, loading };
  if (role !== 'trabalhador') return { podeCriar: false, podeEditar: false, podeExcluir: false, loading };
  return {
    podeCriar: pode(modulo, 'criar'),
    podeEditar: pode(modulo, 'editar'),
    podeExcluir: pode(modulo, 'excluir'),
    loading,
  };
}
