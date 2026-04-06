import { useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext, type AppRole } from '@/contexts/AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [hasCheckedEmpresa, setHasCheckedEmpresa] = useState(false);
  const [empresaStatusCarregado, setEmpresaStatusCarregado] = useState(false);

  const resetEmpresaState = () => {
    setEmpresaId(undefined);
    setHasCheckedEmpresa(false);
    setEmpresaStatusCarregado(false);
  };

  const markEmpresaStateLoaded = () => {
    setHasCheckedEmpresa(true);
    setEmpresaStatusCarregado(true);
  };

  const fetchRole = async (userId: string): Promise<AppRole | null> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const currentRole = (data?.role as AppRole) || null;
    setRole(currentRole);
    return currentRole;
  };

  const fetchEmpresa = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('user_id', userId)
      .single();

    const currentEmpresaId = data?.empresa_id ?? null;
    setEmpresaId(currentEmpresaId);
    console.log('empresaId:', currentEmpresaId, typeof currentEmpresaId);
    return currentEmpresaId;
  };

  const fetchUserMeta = async (userId: string) => {
    resetEmpresaState();

    try {
      await Promise.all([fetchRole(userId), fetchEmpresa(userId)]);
    } catch (err) {
      console.error('Erro ao buscar metadados:', err);
    } finally {
      markEmpresaStateLoaded();
      console.log('verificação concluída:', true);
    }
  };

  const refreshEmpresa = async () => {
    if (!user) return;

    resetEmpresaState();

    try {
      await fetchEmpresa(user.id);
    } catch (err) {
      console.error('Erro ao atualizar empresa:', err);
    } finally {
      markEmpresaStateLoaded();
    }
  };

  useEffect(() => {
    let initialLoad = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        resetEmpresaState();

        if (!initialLoad) {
          setLoading(true);
          fetchUserMeta(currentSession.user.id).then(() => setLoading(false));
        }

        return;
      }

      setRole(null);
      resetEmpresaState();
      markEmpresaStateLoaded();
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchUserMeta(currentSession.user.id);
      } else {
        markEmpresaStateLoaded();
      }

      setLoading(false);
      initialLoad = false;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    resetEmpresaState();
  };

  const canEdit = role === 'admin' || role === 'trabalhador' || role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        hasCheckedEmpresa,
        empresaStatusCarregado,
        signIn,
        signUp,
        signOut,
        canEdit,
        isAdmin,
        isSuperAdmin,
        empresaId,
        refreshEmpresa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
