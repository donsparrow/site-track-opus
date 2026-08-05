/** Query keys hierárquicas do módulo Cronograma. */
export const cronogramaKeys = {
  obras: (empresaId: string | null) => ['obras-cronograma', empresaId] as const,
  cronograma: (obraId: string) => ['cronograma', obraId] as const,
  atividades: (cronogramaId: string | null) => ['cronograma-atividades', cronogramaId] as const,
  aditivos: (obraId: string) => ['obra-aditivos', obraId] as const,
  obraPrazo: (obraId: string) => ['obra-prazo-cronograma', obraId] as const,
  primeiroDiario: (obraId: string) => ['primeiro-diario-cronograma', obraId] as const,
  empresaConfig: () => ['empresa-config-cronograma'] as const,
};

/** Prefixos usados para invalidação ampla após mutações. */
export const cronogramaPrefixes = {
  cronograma: ['cronograma'] as const,
  atividades: ['cronograma-atividades'] as const,
  aditivos: ['obra-aditivos'] as const,
  obraPrazo: ['obra-prazo-cronograma'] as const,
};

/**
 * Prefixos de outros módulos que exibem progresso/prazo da obra e por isso
 * precisam ser invalidados quando o cronograma ou os aditivos mudam.
 */
export const obrasImpactoPrefixes = {
  obrasFinanceiro: ['obras-financeiro'] as const,
  obrasRelatorios: ['obras-relatorios'] as const,
};
