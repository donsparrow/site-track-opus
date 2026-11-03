// Chaves de cache centralizadas do React Query.
// Dados que dependem do usuário incluem userId (e role quando o resultado
// depende dela), garantindo uma requisição por dado e isolamento entre usuários.
export const queryKeys = {
  dashboard: (userId: string, role: string | null) =>
    ['dashboard', userId, role] as const,
  obrasPermitidas: (userId: string, role: string | null) =>
    ['obrasPermitidas', userId, role] as const,
  permissoes: (userId: string, role: string | null) =>
    ['permissoes', userId, role] as const,
  empresaNome: (empresaId: string) =>
    ['empresaNome', empresaId] as const,
  obrasLista: (userId: string) =>
    ['obrasLista', userId] as const,
  clientesLista: (userId: string) =>
    ['clientesLista', userId] as const,
  obraDetalhe: (obraId: string, userId: string) =>
    ['obraDetalhe', obraId, userId] as const,
  timelineObra: (obraId: string) =>
    ['timelineObra', obraId] as const,
};
