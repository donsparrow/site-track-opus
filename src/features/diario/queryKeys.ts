/** Query keys hierárquicas do módulo Diário de Obra. */
export const diarioKeys = {
  obras: (empresaId: string | null) => ['obras-diario', empresaId] as const,
  diarios: (obraId: string) => ['diarios', obraId] as const,
  diario: (diarioId: string | null) => ['diario', diarioId] as const,
  cronogramaAtividades: (obraId: string) => ['cronograma-atividades', obraId] as const,
};
