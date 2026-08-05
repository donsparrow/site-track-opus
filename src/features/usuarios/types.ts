import type { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;
export type UsuarioObra = Tables<'usuario_obras'>;

export interface ObraOption {
  id: string;
  nome: string;
}

export interface EmpresaOption {
  id: string;
  nome: string;
}

/** Usuário mesclado com role, obras vinculadas e nome da empresa. */
export interface UsuarioMerged extends Profile {
  role: string;
  role_id?: string;
  obras_vinculadas: UsuarioObra[];
  obras_count: number;
  empresa_nome: string;
}

export interface PermissaoState {
  [modulo: string]: { v: boolean; c: boolean; e: boolean; x: boolean };
}
