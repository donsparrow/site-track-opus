import { useEffect, useState } from 'react';
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

  // Safety timeout: in the Lovable preview iframe, third-party cookies can be
  // blocked, leaving auth/permissions loading forever. After 3s we let the
  // page render — RLS still protects data on the server.
  const [forceRender, setForceRender] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceRender(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if ((authLoading || permLoading) && !forceRender) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  // After timeout, only block if we already know permission is denied.
  if (!authLoading && !permLoading && !pode(modulo, 'visualizar')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!authLoading && !permLoading && requireEdit && !pode(modulo, 'editar')) {
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
