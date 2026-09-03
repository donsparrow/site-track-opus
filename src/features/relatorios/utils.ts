import type { DadosRelatorio, PrazosRelatorio, SnapshotDados } from './types';

export const fmt = (d: string) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); } catch { return d; }
};

export const revLabel = (n: number) => `REV ${String(n).padStart(2, '0')}`;

export const prazosVazios: PrazosRelatorio = {
  contratual: 0, parados: 0, ajustado: 0, trabalhados: 0, saldo: 0,
  dataInicioReal: '', percentualTempo: 0, percentualExecutado: 0,
};

export const dadosVazios: DadosRelatorio = {
  diarios: [], equipe: [], atividades: [], materiais: [], ocorrencias: [],
  imagens: [], paralisacoes: [], cronograma: [], aditivos: [],
  planejamentoConfigurado: false, prazos: prazosVazios,
};

/** Snapshot do conteúdo atual do relatório, usado na comparação de versões. */
export function buildSnapshot(dados: DadosRelatorio, periodo: { inicio: string; fim: string }): SnapshotDados {
  return {
    prazos: dados.prazos,
    periodo,
    diarios_count: dados.diarios.length,
    equipe_count: dados.equipe.length,
    atividades_count: dados.atividades.length,
    materiais_count: dados.materiais.length,
    ocorrencias_count: dados.ocorrencias.length,
    paralisacoes_count: dados.paralisacoes.length,
    imagens_count: dados.imagens.length,
  };
}

type SnapshotParcial = Partial<SnapshotDados> | null | undefined;

/** Compara dois snapshots e gera o resumo textual das alterações. */
export function detectChanges(
  prev: SnapshotParcial,
  curr: SnapshotDados,
  isPrimeiraVersao = false
): { hasChanges: boolean; summary: string } {
  if (isPrimeiraVersao) return { hasChanges: true, summary: 'Criação do relatório' };
  if (!prev) return { hasChanges: true, summary: 'Atualização do relatório' };
  const changes: string[] = [];
  /** Campo ausente em snapshot antigo não conta como alteração (evita revisão falsa). */
  const diffCount = (before: number | undefined, after: number, label: string) => {
    if ((before ?? after) !== after) changes.push(`${label}: ${before ?? 0} -> ${after}`);
  };
  if (prev.prazos?.contratual !== curr.prazos?.contratual) changes.push(`Prazo alterado de ${prev.prazos?.contratual || 0} para ${curr.prazos?.contratual || 0} dias`);
  if (prev.prazos?.parados !== curr.prazos?.parados) changes.push(`Dias parados: ${prev.prazos?.parados || 0} → ${curr.prazos?.parados || 0}`);
  if (prev.prazos?.trabalhados !== curr.prazos?.trabalhados) changes.push(`Dias trabalhados: ${prev.prazos?.trabalhados || 0} → ${curr.prazos?.trabalhados || 0}`);
  if (prev.periodo?.inicio !== curr.periodo?.inicio || prev.periodo?.fim !== curr.periodo?.fim) changes.push('Alteração no período');
  diffCount(prev.imagens_count, curr.imagens_count, 'Imagens');
  diffCount(prev.atividades_count, curr.atividades_count, 'Atividades');
  diffCount(prev.equipe_count, curr.equipe_count, 'Equipe');
  diffCount(prev.materiais_count, curr.materiais_count, 'Materiais');
  diffCount(prev.ocorrencias_count, curr.ocorrencias_count, 'Ocorrências');
  diffCount(prev.paralisacoes_count, curr.paralisacoes_count, 'Paralisações');
  return { hasChanges: changes.length > 0, summary: changes.length > 0 ? changes.join('; ') : '' };
}

export interface SmartStatus { label: string; color: string; bg: string; }

/** Status inteligente: progresso físico vs prazo consumido (tolerância ±5%). */
export function getSmartStatus(prazos: PrazosRelatorio): SmartStatus {
  const desvio = prazos.percentualExecutado - prazos.percentualTempo;
  if (!prazos.dataInicioReal) return { label: 'Não iniciada', color: 'text-muted-foreground', bg: 'bg-muted/10 border-muted/30' };
  if (prazos.percentualExecutado <= 0 && prazos.percentualTempo <= 0) return { label: 'Sem dados suficientes', color: 'text-muted-foreground', bg: 'bg-muted/10 border-muted/30' };
  if (desvio > 5) return { label: 'Adiantada', color: 'text-success', bg: 'bg-success/10 border-success/30' };
  if (desvio >= -5) return { label: 'Em Dia', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' };
  return { label: 'Atrasada', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' };
}

export const statusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
  const map: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    rascunho: 'outline',
    finalizado: 'secondary',
    assinado: 'default',
  };
  return map[status] || 'outline';
};
