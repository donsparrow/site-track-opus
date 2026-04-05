import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Modulo = 'dashboard' | 'financeiro' | 'diario_obra' | 'cronograma' | 'relatorios' | 'documentos' | 'usuarios' | 'configuracoes' | 'clientes';

export interface Permissao {
  modulo: Modulo;
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

const MODULOS: Modulo[] = ['dashboard', 'financeiro', 'diario_obra', 'cronograma', 'relatorios', 'documentos', 'usuarios', 'configuracoes', 'clientes'];

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
};

export { MODULOS, MODULO_LABELS };

export function usePermissions() {
  const { user, role, isSuperAdmin, isAdmin } = useAuth();
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissoes([]);
      setLoading(false);
      return;
    }

    // Super admin and admin always have full access
    if (isSuperAdmin || isAdmin) {
      setPermissoes(MODULOS.map(m => ({
        modulo: m,
        pode_visualizar: true,
        pode_criar: true,
        pode_editar: true,
        pode_excluir: true,
      })));
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from('permissoes_usuario')
        .select('modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        setPermissoes(data as Permissao[]);
      } else {
        // Fallback: no permissions found = no access
        setPermissoes(MODULOS.map(m => ({
          modulo: m,
          pode_visualizar: false,
          pode_criar: false,
          pode_editar: false,
          pode_excluir: false,
        })));
      }
      setLoading(false);
    };

    fetch();
  }, [user, role, isSuperAdmin, isAdmin]);

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
