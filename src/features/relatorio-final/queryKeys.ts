/** Query keys do módulo Laudos Técnicos (Relatório Final). */
export const relatorioFinalKeys = {
  obras: () => ['relatorio-final', 'obras'] as const,
  relatorio: (obraId: string | null, tipo?: string) =>
    ['relatorio-final', 'relatorio', obraId, tipo ?? 'entrega_obra'] as const,
  fotos: (relatorioId: string | null) => ['relatorio-final', 'fotos', relatorioId] as const,
};
