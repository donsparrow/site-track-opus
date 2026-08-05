import type { DadosRelatorio, Relatorio } from './types';

/**
 * Indicadores do Resumo Executivo congelados no fechamento do relatório.
 * O relatório é um documento imutável: uma vez gravados, esses valores
 * são a fonte da verdade do PDF e da tela — nunca o estado atual da obra.
 */
export interface IndicadoresCongelados {
  progresso_fisico: number;
  prazo_consumido: number;
  desvio: number;
  status_obra: string;
  dias_trabalhados_snapshot: number;
  dias_parados_snapshot: number;
  diarios_registrados: number;
  indicadores_congelados_em: string;
}

/** Rótulo de status derivado do desvio (mesma regra de `getSmartStatus`). */
export function statusObraLabel(progresso: number, prazoConsumido: number, dataInicioReal: string): string {
  if (!dataInicioReal) return 'Não iniciada';
  if (progresso <= 0 && prazoConsumido <= 0) return 'Sem dados suficientes';
  const desvio = progresso - prazoConsumido;
  if (desvio > 5) return 'Adiantada';
  if (desvio >= -5) return 'Em Dia';
  return 'Atrasada';
}

/** Monta o payload de congelamento a partir dos dados calculados agora. */
export function calcularIndicadores(dados: DadosRelatorio): IndicadoresCongelados {
  const { percentualExecutado, percentualTempo, trabalhados, parados, dataInicioReal } = dados.prazos;
  return {
    progresso_fisico: percentualExecutado,
    prazo_consumido: percentualTempo,
    desvio: percentualExecutado - percentualTempo,
    status_obra: statusObraLabel(percentualExecutado, percentualTempo, dataInicioReal),
    dias_trabalhados_snapshot: trabalhados,
    dias_parados_snapshot: parados,
    diarios_registrados: dados.diarios.length,
    indicadores_congelados_em: new Date().toISOString(),
  };
}

type RelatorioIndicadores = Pick<
  Relatorio,
  'progresso_fisico' | 'prazo_consumido' | 'dias_trabalhados_snapshot' | 'dias_parados_snapshot'
> | null | undefined;

/**
 * Aplica os indicadores congelados sobre os dados recém-carregados.
 * Usado só para exibição/PDF — as mutations continuam gravando o cálculo atual.
 */
export function aplicarIndicadoresCongelados(dados: DadosRelatorio, relatorio: RelatorioIndicadores): DadosRelatorio {
  if (!relatorio || relatorio.progresso_fisico === null || relatorio.progresso_fisico === undefined) return dados;
  return {
    ...dados,
    prazos: {
      ...dados.prazos,
      percentualExecutado: relatorio.progresso_fisico,
      percentualTempo: relatorio.prazo_consumido ?? dados.prazos.percentualTempo,
      trabalhados: relatorio.dias_trabalhados_snapshot ?? dados.prazos.trabalhados,
      parados: relatorio.dias_parados_snapshot ?? dados.prazos.parados,
    },
  };
}
