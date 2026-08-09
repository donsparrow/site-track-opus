import type { CronogramaAtividadeOption } from './types';

export type EstadoServico = 'disponivel' | 'concluido' | 'ja_lancado';

export interface ServicoClassificado {
  atividade: CronogramaAtividadeOption;
  estado: EstadoServico;
  /** Selecionável no Select. */
  habilitado: boolean;
  /** Badge discreto exibido no item (null quando não há nada a sinalizar). */
  badge: string | null;
}

export interface ClassificacaoServicos {
  itens: ServicoClassificado[];
  disponiveis: ServicoClassificado[];
  indisponiveis: ServicoClassificado[];
  totalDisponiveis: number;
  total: number;
  /** true quando existem serviços mas nenhum pode ser selecionado. */
  todosIndisponiveis: boolean;
}

/** Percentual normalizado: nulo, undefined ou não numérico viram 0 (explicitamente). */
export function percentualSeguro(valor: unknown): number {
  const n =
    typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export interface ClassificarServicosParams {
  atividades: CronogramaAtividadeOption[];
  /** IDs de cronograma_atividades já lançados no diário atual. */
  lancadasIds: string[];
  /** ID atualmente vinculado ao lançamento em edição (permanece selecionável). */
  selecionadoId?: string | null;
  /** Reabre serviços 100% concluídos para retrabalho. */
  permitirRetrabalho?: boolean;
}

/**
 * Classifica e ordena os serviços de uma obra: disponíveis primeiro (preservando a
 * ordem original entre si), depois concluídos e já lançados. Função pura e isolada,
 * reutilizável por outros módulos (Cronograma, Relatórios).
 */
export function classificarServicos({
  atividades,
  lancadasIds,
  selecionadoId = null,
  permitirRetrabalho = false,
}: ClassificarServicosParams): ClassificacaoServicos {
  const lancados = new Set(lancadasIds.filter(Boolean));

  const itens: ServicoClassificado[] = atividades.map((atividade) => {
    const pct = percentualSeguro(atividade.percentual_concluido);
    const isSelecionado = !!selecionadoId && atividade.id === selecionadoId;
    const concluido = pct >= 100;
    const jaLancado = lancados.has(atividade.id) && !isSelecionado;

    let estado: EstadoServico = 'disponivel';
    if (jaLancado) estado = 'ja_lancado';
    else if (concluido) estado = 'concluido';

    let habilitado: boolean;
    if (isSelecionado) habilitado = true;
    else if (estado === 'ja_lancado') habilitado = false;
    else if (estado === 'concluido') habilitado = permitirRetrabalho;
    else habilitado = true;

    let badge: string | null = null;
    if (estado === 'ja_lancado') badge = 'Já lançado neste diário';
    else if (concluido) badge = '100% concluído';

    return { atividade, estado, habilitado, badge };
  });

  const disponiveis = itens.filter((i) => i.habilitado);
  const indisponiveis = itens.filter((i) => !i.habilitado);

  return {
    itens: [...disponiveis, ...indisponiveis],
    disponiveis,
    indisponiveis,
    totalDisponiveis: disponiveis.length,
    total: itens.length,
    todosIndisponiveis: itens.length > 0 && disponiveis.length === 0,
  };
}
