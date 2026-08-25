/** Query keys do módulo Relatório Final. */
export const relatorioFinalKeys = {
  obras: () => ['relatorio-final-obras'] as const,
  relatorio: (obraId: string | null) => ['relatorio-final', obraId] as const,
  fotos: (relatorioId: string | null) => ['relatorio-final-fotos', relatorioId] as const,
};
