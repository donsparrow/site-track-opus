/** Query keys do módulo Laudos Técnicos (Relatório Final). */
export const relatorioFinalKeys = {
  lista: (userId?: string, role?: string | null) => ['relatorio-final', 'lista', ...(userId ? [userId, role] : [])] as const,
  urls: (userId: string | undefined, paths: string[]) => ['relatorio-final', 'urls', userId, paths] as const,
  obras: () => ['relatorio-final', 'obras'] as const,
  relatorio: (obraId: string | null, tipo?: string) =>
    ['relatorio-final', 'relatorio', obraId, tipo ?? 'entrega_obra'] as const,
  fotos: (relatorioId: string | null) => ['relatorio-final', 'fotos', relatorioId] as const,
  importado: (relatorioId: string | null) => ['relatorio-final', 'importado', relatorioId] as const,
};
