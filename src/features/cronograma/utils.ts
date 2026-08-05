import { differenceInDays, parseISO } from 'date-fns';
import type { Atividade, Aditivo } from './types';
import type { StatusObra } from './components/IndicadoresCard';
import type { GanttData } from './pdf';

/** Dias úteis (seg–sex) entre duas datas, inclusive. */
export function businessDaysBetween(from: Date, to: Date) {
  let count = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Progresso ponderado por peso (fallback para média simples quando não há pesos). */
export function calcularProgressoGeral(atividades: Atividade[], totalPeso: number) {
  if (atividades.length === 0) return 0;
  if (totalPeso > 0) {
    return Math.round(
      atividades.reduce((sum, a) => sum + (a.peso || 0) * a.percentual_concluido, 0) / 100,
    );
  }
  return Math.round(atividades.reduce((sum, a) => sum + a.percentual_concluido, 0) / atividades.length);
}

export interface IndicadoresCronograma {
  totalPeso: number;
  pesoValido: boolean;
  progressoGeral: number;
  diasAditivos: number;
  prazoEfetivo: number;
  diasDecorridos: number;
  prazoConsumido: number;
  desvio: number;
  planejamentoConfigurado: boolean;
  statusObra: StatusObra;
}

export function calcularIndicadores(
  atividades: Atividade[],
  aditivos: Aditivo[],
  prazoContratual: number,
  primeiroDiario: string | null,
): IndicadoresCronograma {
  const totalPeso = atividades.reduce((sum, a) => sum + (a.peso || 0), 0);
  const pesoValido = totalPeso === 100;
  const progressoGeral = calcularProgressoGeral(atividades, totalPeso);

  const diasAditivos = aditivos.reduce((s, a) => s + (a.dias_adicionais || 0), 0);
  const prazoEfetivo = prazoContratual + diasAditivos;
  const diasDecorridos = primeiroDiario ? businessDaysBetween(parseISO(primeiroDiario), new Date()) : 0;
  const prazoConsumido = prazoEfetivo > 0 ? Math.round((diasDecorridos / prazoEfetivo) * 100) : 0;
  const desvio = progressoGeral - prazoConsumido;
  const planejamentoConfigurado = atividades.length > 0;

  const statusObra: StatusObra = !planejamentoConfigurado
    ? { label: 'Planejamento pendente', color: 'text-muted-foreground', dot: '⚪', cls: 'border-muted/30 bg-muted/10' }
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
    progressoGeral,
    diasAditivos,
    prazoEfetivo,
    diasDecorridos,
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
