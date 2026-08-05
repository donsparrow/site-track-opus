/** Query keys hierárquicas do módulo Ferramentas. */
export const ferramentasKeys = {
  all: ['ferramentas'] as const,
  lista: (empresaId: string | null) => ['ferramentas', empresaId] as const,
  obras: (empresaId: string | null) => ['obras-ferramentas', empresaId] as const,
  historico: (ferramentaId: string | null) => ['ferramentas-historico', ferramentaId] as const,
};

/** Prefixos usados para invalidação ampla após mutações. */
export const ferramentasPrefixes = {
  ferramentas: ['ferramentas'] as const,
  obras: ['obras-ferramentas'] as const,
  historico: ['ferramentas-historico'] as const,
};
