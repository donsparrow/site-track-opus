import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'trabalhador' | 'sindico' | 'cliente' | 'super_admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  hasCheckedEmpresa: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  canEdit: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  empresaId: string | null;
  refreshEmpresa: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCheckedEmpresa, setHasCheckedEmpresa] = useState(false);

  const fetchRole = async (userId: string): Promise<AppRole | null> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    const r = (data?.role as AppRole) || null;
    setRole(r);
    return r;
  };

  const fetchEmpresa = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('user_id', userId)
      .single();
    const eid = data?.empresa_id || null;
    setEmpresaId(eid);
    console.log("empresa_id:", eid);
    return eid;
  };

  const fetchUserMeta = async (userId: string) => {
    try {
      await Promise.all([fetchRole(userId), fetchEmpresa(userId)]);
    } catch (err) {
      console.error("Erro ao buscar metadados:", err);
    } finally {
      setHasCheckedEmpresa(true);
      console.log("verificação concluída:", true);
    }
  };

  const refreshEmpresa = async () => {
    if (user) await fetchEmpresa(user.id);
  };

  // Tracks which user_id we have already loaded metadata for, so we don't
  // refetch on every auth event (TOKEN_REFRESHED, USER_UPDATED, ...) but we
  // also never skip the very first fetch on either getSession or onAuthStateChange.
  const loadedUserIdRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const ensureUserMeta = async (userId: string) => {
    if (loadedUserIdRef.current === userId) return;
    if (inFlightRef.current) return inFlightRef.current;
    const p = (async () => {
      await fetchUserMeta(userId);
      loadedUserIdRef.current = userId;
    })().finally(() => { inFlightRef.current = null; });
    inFlightRef.current = p;
    return p;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await ensureUserMeta(session.user.id);
        } else {
          loadedUserIdRef.current = null;
          setRole(null);
          setEmpresaId(null);
          setHasCheckedEmpresa(true);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureUserMeta(session.user.id);
      } else {
        setHasCheckedEmpresa(true);
      }
      setLoading(false);
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
    setEmpresaId(null);
  };

  const canEdit = role === 'admin' || role === 'trabalhador' || role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, session, role, loading, hasCheckedEmpresa, signIn, signUp, signOut, canEdit, isAdmin, isSuperAdmin, empresaId, refreshEmpresa }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
