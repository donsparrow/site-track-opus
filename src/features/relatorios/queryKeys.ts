/** Query keys hierárquicas do módulo Relatórios. */
export const relatoriosKeys = {
  obras: (empresaId: string | null) => ['obras-relatorios', empresaId] as const,
  empresa: (empresaId: string | null) => ['empresa-config', empresaId] as const,
  lista: (empresaId: string | null) => ['relatorios', empresaId] as const,
  detalhe: (relatorioId: string | null) => ['relatorio', relatorioId] as const,
  dados: (obraId: string, inicio: string, fim: string, relatorioId: string | null) =>
    ['relatorio-dados', obraId, inicio, fim, relatorioId] as const,
  assinaturas: (relatorioId: string | null) => ['relatorio-assinaturas', relatorioId] as const,
  versoes: (relatorioId: string | null) => ['relatorio-versoes', relatorioId] as const,
  logs: (relatorioId: string | null) => ['relatorio-logs', relatorioId] as const,
};

/** Prefixos usados para invalidação ampla após mutações. */
export const relatoriosPrefixes = {
  lista: ['relatorios'] as const,
  detalhe: ['relatorio'] as const,
  dados: ['relatorio-dados'] as const,
  assinaturas: ['relatorio-assinaturas'] as const,
  versoes: ['relatorio-versoes'] as const,
  logs: ['relatorio-logs'] as const,
};
