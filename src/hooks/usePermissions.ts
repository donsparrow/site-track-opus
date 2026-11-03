import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

export type Modulo = 'dashboard' | 'financeiro' | 'diario_obra' | 'cronograma' | 'relatorios' | 'documentos' | 'usuarios' | 'configuracoes' | 'clientes' | 'ferramentas' | 'relatorio_final' | 'funcionarios';

export interface Permissao {
  modulo: Modulo;
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

const MODULOS: Modulo[] = ['dashboard', 'financeiro', 'diario_obra', 'cronograma', 'relatorios', 'documentos', 'usuarios', 'configuracoes', 'clientes', 'ferramentas', 'relatorio_final', 'funcionarios'];

const MODULO_LABELS: Record<Modulo, string> = {
  dashboard: 'Dashboard',
  financeiro: 'Financeiro',
  diario_obra: 'Diário de Obra',
  cronograma: 'Cronograma',
  relatorios: 'Relatórios',
  documentos: 'Documentação',
  usuarios: 'Usuários',
  configuracoes: 'Configurações',
  clientes: 'Clientes',
  ferramentas: 'Ferramentas',
  relatorio_final: 'Laudos Técnicos',
  funcionarios: 'Funcionários',
};

// Map route paths to module names
export const ROUTE_MODULE_MAP: Record<string, Modulo> = {
  '/dashboard': 'dashboard',
  '/financeiro': 'financeiro',
  '/diario': 'diario_obra',
  '/cronograma': 'cronograma',
  '/relatorios': 'relatorios',
  '/documentacao': 'documentos',
  '/usuarios': 'usuarios',
  '/configuracoes': 'configuracoes',
  '/clientes': 'clientes',
  '/ferramentas': 'ferramentas',
  '/relatorio-final': 'relatorio_final',
  '/funcionarios': 'funcionarios',
};

export { MODULOS, MODULO_LABELS };

const fullAccess = (): Permissao[] =>
  MODULOS.map(m => ({
    modulo: m,
    pode_visualizar: true,
    pode_criar: true,
    pode_editar: true,
    pode_excluir: true,
  }));

const noAccess = (): Permissao[] =>
  MODULOS.map(m => ({
    modulo: m,
    pode_visualizar: false,
    pode_criar: false,
    pode_editar: false,
    pode_excluir: false,
  }));

export function usePermissions() {
  const { user, role, isSuperAdmin, isAdmin } = useAuth();
  const isPrivileged = isSuperAdmin || isAdmin;
  const needsQuery = !!user && !isPrivileged;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissoes(user?.id ?? '', role),
    enabled: needsQuery,
    queryFn: async (): Promise<Permissao[]> => {
      const { data } = await supabase
        .from('permissoes_usuario')
        .select('modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir')
        .eq('user_id', user!.id);

      if (data && data.length > 0) {
        return data as Permissao[];
      }
      // Fallback: no permissions found = no access
      return noAccess();
    },
  });

  // Super admin and admin always have full access, sem consulta
  const permissoes: Permissao[] = isPrivileged ? fullAccess() : (data ?? []);
  const loading = needsQuery && isLoading;

  const pode = (modulo: Modulo, acao: 'visualizar' | 'criar' | 'editar' | 'excluir'): boolean => {
    if (isSuperAdmin || isAdmin) return true;
    const p = permissoes.find(p => p.modulo === modulo);
    if (!p) return false;
    switch (acao) {
      case 'visualizar': return p.pode_visualizar;
      case 'criar': return p.pode_criar;
      case 'editar': return p.pode_editar;
      case 'excluir': return p.pode_excluir;
    }
  };

  return { permissoes, loading, pode };
}
