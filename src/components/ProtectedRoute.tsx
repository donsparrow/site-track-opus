import { Navigate } from 'react-router-dom';
import { usePermissions, type Modulo } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  modulo: Modulo;
  children: React.ReactNode;
  requireEdit?: boolean;
}

export default function ProtectedRoute({ modulo, children, requireEdit = false }: ProtectedRouteProps) {
  const { loading: authLoading } = useAuth();
  const { loading: permLoading, pode } = usePermissions();

  if (authLoading || permLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!pode(modulo, 'visualizar')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireEdit && !pode(modulo, 'editar')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Acesso negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para editar este módulo.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
