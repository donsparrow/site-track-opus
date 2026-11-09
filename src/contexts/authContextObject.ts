import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';

/** Objeto de contexto isolado: mantém a mesma identidade quando AuthContext.tsx é recarregado ao vivo. */
export type AppRole = 'admin' | 'trabalhador' | 'sindico' | 'cliente' | 'super_admin';

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
