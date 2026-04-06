import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'trabalhador' | 'sindico' | 'cliente' | 'super_admin';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  hasCheckedEmpresa: boolean;
  empresaStatusCarregado: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  canEdit: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  empresaId: string | null | undefined;
  refreshEmpresa: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
