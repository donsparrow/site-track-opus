import { differenceInDays, parseISO } from 'date-fns';
import type { Atividade, Aditivo } from './types';
import type { StatusObra } from './components/IndicadoresCard';
import type { GanttData } from './pdf';
import { calcularProgressoEscopo, calcularProgressoOriginal } from '@/lib/progressoFisico';
import { calcBusinessDays } from '@/lib/dias';
import { hojeLocal } from '@/lib/dataLocal';
import {
  calcularProgressoGlobal, calcularPrazoConsumido, datasUteisParadas, diasUteisSemDiario, type ProgressoPorAditivo,
} from '@/lib/prazoObra';

/** Progresso do ESCOPO ORIGINAL (regra canônica em src/lib/progressoFisico.ts). */
export function calcularProgressoGeral(atividades: Atividade[], _totalPeso?: number) {
  return calcularProgressoOriginal(atividades);
}

export interface IndicadoresCronograma {
  /** Soma dos pesos das atividades ORIGINAIS. */
  totalPeso: number;
  /** Pesos originais somam 100. */
  pesoValido: boolean;
  /** Progresso do escopo original (0–100). Mantido para o PDF do cronograma. */
  progressoGeral: number;
  progressoContrato: number;
  /** Contrato + aditivos, ponderado pelos dias de cada um. */
  progressoGlobal: number;
  progressoPorAditivo: ProgressoPorAditivo[];
  atividadesAditivoSemVinculo: number;
  /** Progresso combinado dos aditivos, ponderado pelos dias. */
  progressoAditivos: number;
  totalPesoAditivos: number;
  temAditivos: boolean;
  diasAditivos: number;
  prazoEfetivo: number;
  diasDecorridos: number;
  diasParados: number;
  diasConsumidos: number;
  diasSemDiario: string[];
  prazoConsumido: number;
  desvio: number;
  planejamentoConfigurado: boolean;
  statusObra: StatusObra;
}

export interface CalcularIndicadoresParams {
  atividades: Atividade[];
  aditivos: Aditivo[];
  prazoContratual: number;
  primeiroDiario: string | null;
  obraStatus?: string | null;
  ultimoDiario?: string | null;
  dataFimPrevista?: string | null;
  paralisacoes?: { data_inicio: string; data_fim?: string | null }[];
  datasDiarios?: string[];
}

function ontemLocal(): string {
  const d = new Date(hojeLocal() + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calcularIndicadores({
  atividades, aditivos, prazoContratual, primeiroDiario, obraStatus, ultimoDiario, dataFimPrevista,
  paralisacoes = [], datasDiarios = [],
}: CalcularIndicadoresParams): IndicadoresCronograma {
  const escopo = calcularProgressoEscopo(atividades);
  const totalPeso = escopo.pesoOriginal;
  const pesoValido = totalPeso === 100;
  const prog = calcularProgressoGlobal(atividades, aditivos, prazoContratual);

  const concluida = obraStatus === 'concluida';
  const diasAditivos = aditivos.reduce((s, a) => s + (a.dias_adicionais || 0), 0);
  const prazoEfetivo = prazoContratual + diasAditivos;
  // Obra concluída: fim congelado (último diário → data_fim_prevista); ativa: hoje.
  const fimConcluida = concluida ? (ultimoDiario || dataFimPrevista || null) : null;
  const dataCorte = concluida ? fimConcluida : hojeLocal();
  const diasDecorridos = !primeiroDiario || !dataCorte ? 0 : calcBusinessDays(primeiroDiario, dataCorte);
  const diasParados = primeiroDiario && dataCorte ? datasUteisParadas(paralisacoes, primeiroDiario, dataCorte).size : 0;
  const consumo = calcularPrazoConsumido(diasDecorridos, diasParados, prazoEfetivo);
  const prazoConsumido = consumo.percentual;
  const desvio = prog.global - prazoConsumido;
  const planejamentoConfigurado = atividades.length > 0;
  const diasSemDiario = !concluida && primeiroDiario ? diasUteisSemDiario(datasDiarios, primeiroDiario, ontemLocal()) : [];

  const statusObra: StatusObra = !planejamentoConfigurado
    ? { label: 'Planejamento pendente', color: 'text-muted-foreground', dot: '⚪', cls: 'border-muted/30 bg-muted/10' }
    : concluida
      ? { label: 'Concluída', color: 'text-success', dot: '✅', cls: 'border-success/30 bg-success/10' }
    : !primeiroDiario
      ? { label: 'Não iniciada', color: 'text-muted-foreground', dot: '●', cls: 'border-muted/30 bg-muted/10' }
      : desvio > 5
        ? { label: 'Adiantada', color: 'text-success', dot: '🟢', cls: 'border-success/30 bg-success/10' }
        : desvio >= -5
          ? { label: 'Em Dia', color: 'text-warning', dot: '🟡', cls: 'border-warning/30 bg-warning/10' }
          : { label: 'Atrasada', color: 'text-destructive', dot: '🔴', cls: 'border-destructive/30 bg-destructive/10' };

  return {
    totalPeso,
    pesoValido,
    progressoGeral: prog.contrato,
    progressoContrato: prog.contrato,
    progressoGlobal: prog.global,
    progressoPorAditivo: prog.porAditivo,
    atividadesAditivoSemVinculo: prog.atividadesSemVinculo,
    progressoAditivos: prog.aditivos,
    totalPesoAditivos: escopo.pesoAditivo,
    temAditivos: escopo.temAditivos || aditivos.length > 0,
    diasAditivos,
    prazoEfetivo,
    diasDecorridos,
    diasParados,
    diasConsumidos: consumo.diasConsumidos,
    diasSemDiario,
    prazoConsumido,
    desvio,
    planejamentoConfigurado,
    statusObra,
  };
}

/** Dados do gráfico de Gantt (null quando não há atividades com datas). */
export function calcularGanttData(atividades: Atividade[]): GanttData | null {
  const validAtivs = atividades.filter(a => a.data_inicio && a.data_fim);
  if (validAtivs.length === 0) return null;
  const allDates = validAtivs.flatMap(a => [parseISO(a.data_inicio!), parseISO(a.data_fim!)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const totalDays = Math.max(differenceInDays(maxDate, minDate), 1);
  return { minDate, maxDate, totalDays, validAtivs };
}
