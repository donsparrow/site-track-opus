/** Query keys hierárquicas do módulo Financeiro. */
export const financeiroKeys = {
  all: ['financeiro'] as const,
  obras: (empresaId: string | null) => ['obras-financeiro', empresaId] as const,
  receitas: (empresaId: string | null, obraId: string) =>
    ['receitas', empresaId, obraId] as const,
  despesas: (empresaId: string | null, obraId: string) =>
    ['despesas', empresaId, obraId] as const,
  parcelas: (receitaId: string | null) => ['parcelas', receitaId] as const,
  parcelasRecebidas: (empresaId: string | null, obraId: string) =>
    ['parcelas-recebidas', empresaId, obraId] as const,
  anexos: (empresaId: string | null) => ['financeiro-anexos', empresaId] as const,
};

/** Prefixos usados para invalidação ampla após mutações. */
export const financeiroPrefixes = {
  receitas: ['receitas'] as const,
  despesas: ['despesas'] as const,
  parcelas: ['parcelas'] as const,
  parcelasRecebidas: ['parcelas-recebidas'] as const,
  anexos: ['financeiro-anexos'] as const,
};
