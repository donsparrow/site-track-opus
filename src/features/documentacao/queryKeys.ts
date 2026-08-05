/** Query keys hierárquicas do módulo Documentação. */
export const documentacaoKeys = {
  all: ['documentacao'] as const,
  obras: (empresaId: string | null) => ['obras-documentacao', empresaId] as const,
  pastas: (obraId: string | null) => ['documentos-pastas', obraId] as const,
  arquivos: (pastaId: string | null) => ['documentos-arquivos', pastaId] as const,
};

/** Prefixos usados para invalidação ampla após mutações. */
export const documentacaoPrefixes = {
  pastas: ['documentos-pastas'] as const,
  arquivos: ['documentos-arquivos'] as const,
};
