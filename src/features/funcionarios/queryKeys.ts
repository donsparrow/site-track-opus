/** Query keys exclusivas do módulo Funcionários. */
export const funcionariosKeys = {
  lista: ['funcionarios'] as const,
  obras: ['funcionarios-obras'] as const,
  ponto: (inicio: string, fim: string) => ['ponto', inicio, fim] as const,
  lancamentos: (funcionarioId: string | null, inicio?: string, fim?: string) =>
    ['lancamentos', funcionarioId ?? 'todos', inicio ?? '', fim ?? ''] as const,
  adiantamentos: (funcionarioId: string | null) =>
    ['adiantamentos', funcionarioId ?? 'todos'] as const,
};

export const funcionariosPrefixes = {
  funcionarios: ['funcionarios'] as const,
  ponto: ['ponto'] as const,
  lancamentos: ['lancamentos'] as const,
  adiantamentos: ['adiantamentos'] as const,
};
