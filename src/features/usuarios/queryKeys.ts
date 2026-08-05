/** Query keys hierárquicas do módulo Usuários. */
export const usuariosKeys = {
  all: ['usuarios'] as const,
  list: (empresaId: string | null, isSuperAdmin: boolean) =>
    ['usuarios', empresaId, isSuperAdmin] as const,
  obras: ['obras-usuarios'] as const,
  empresas: ['empresas-usuarios'] as const,
  permissoes: (userId: string) => ['permissoes-usuario', userId] as const,
};

/** Prefixos usados para invalidação ampla após mutações. */
export const usuariosPrefixes = {
  usuarios: ['usuarios'] as const,
  permissoes: ['permissoes-usuario'] as const,
};
