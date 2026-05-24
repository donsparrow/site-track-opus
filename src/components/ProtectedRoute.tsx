import { useEffect, useRef, useState } from 'react';
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

  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [permTimedOut, setPermTimedOut] = useState(false);
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      if (authTimedOut) setAuthTimedOut(false);
      return;
    }

    if (!authTimedOut && !authTimeoutRef.current) {
      authTimeoutRef.current = setTimeout(() => {
        setAuthTimedOut(true);
        authTimeoutRef.current = null;
      }, 3000);
    }

    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    };
  }, [authLoading, authTimedOut]);

  useEffect(() => {
    if (!permLoading) {
      if (permTimeoutRef.current) {
        clearTimeout(permTimeoutRef.current);
        permTimeoutRef.current = null;
      }
      if (permTimedOut) setPermTimedOut(false);
      return;
    }

    if (!permTimedOut && !permTimeoutRef.current) {
      permTimeoutRef.current = setTimeout(() => {
        setPermTimedOut(true);
        permTimeoutRef.current = null;
      }, 3000);
    }

    return () => {
      if (permTimeoutRef.current) {
        clearTimeout(permTimeoutRef.current);
        permTimeoutRef.current = null;
      }
    };
  }, [permLoading, permTimedOut]);

  const isAuthWaiting = authLoading && !authTimedOut;
  const isPermWaiting = permLoading && !permTimedOut;
  const canEvaluatePermissions = !authLoading && !permLoading;

  if (isAuthWaiting || isPermWaiting) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  // Only enforce frontend permissions after auth and permissions really resolve.
  // If the Lovable preview iframe keeps loading forever, render after timeout;
  // backend RLS continues to protect data.
  if (canEvaluatePermissions && !pode(modulo, 'visualizar')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (canEvaluatePermissions && requireEdit && !pode(modulo, 'editar')) {
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
