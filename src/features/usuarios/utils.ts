import type { UsuarioMerged } from './types';

/** Impede remover o cargo de super_admin do único administrador geral restante. */
export function podeAlterarRole(users: UsuarioMerged[], userId: string, novoTipo: string): { ok: boolean; erro?: string } {
  const editedUser = users.find(u => u.user_id === userId);
  if (editedUser?.role === 'super_admin' && novoTipo !== 'super_admin') {
    const superAdminCount = users.filter(u => u.role === 'super_admin').length;
    if (superAdminCount <= 1) {
      return { ok: false, erro: 'Não é possível remover o último Administrador Geral do sistema' };
    }
  }
  return { ok: true };
}

/** Impede excluir o último super_admin, ou qualquer super_admin sem ser super_admin. */
export function podeExcluirUsuario(users: UsuarioMerged[], userId: string, isSuperAdmin: boolean): { ok: boolean; erro?: string } {
  const targetUser = users.find(u => u.user_id === userId);
  if (targetUser?.role === 'super_admin' && !isSuperAdmin) {
    return { ok: false, erro: 'Apenas Administrador Geral pode excluir outro Administrador Geral' };
  }
  if (targetUser?.role === 'super_admin') {
    const superAdminCount = users.filter(u => u.role === 'super_admin').length;
    if (superAdminCount <= 1) {
      return { ok: false, erro: 'Não é possível excluir o último Administrador Geral do sistema' };
    }
  }
  return { ok: true };
}
