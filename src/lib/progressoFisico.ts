/**
 * Regra canônica do progresso físico (única fonte da fórmula).
 * - "% executado" do cabeçalho = só ESCOPO ORIGINAL (tipo_atividade 'original' ou nulo).
 * - Aditivos (tipo_atividade 'aditivo') têm progresso próprio, exibido à parte.
 * Ponderado por peso; se a soma dos pesos do grupo for 0, média simples. Sempre 0–100.
 */
export interface AtividadeProgresso {
  peso?: number | null;
  percentual_concluido?: number | null;
  tipo_atividade?: string | null;
}

export interface ProgressoEscopo {
  original: number;
  aditivo: number;
  temAditivos: boolean;
  pesoOriginal: number;
  pesoAditivo: number;
}

export const isAditivo = (a: AtividadeProgresso) => a.tipo_atividade === 'aditivo';

function progressoGrupo(ativs: AtividadeProgresso[]): number {
  if (ativs.length === 0) return 0;
  const somaPeso = ativs.reduce((s, a) => s + (a.peso || 0), 0);
  const bruto = somaPeso > 0
    ? ativs.reduce((s, a) => s + (a.peso || 0) * (a.percentual_concluido || 0), 0) / somaPeso
    : ativs.reduce((s, a) => s + (a.percentual_concluido || 0), 0) / ativs.length;
  return Math.min(100, Math.max(0, Math.round(bruto)));
}

export function calcularProgressoEscopo(ativs: AtividadeProgresso[]): ProgressoEscopo {
  const originais = ativs.filter((a) => !isAditivo(a));
  const aditivos = ativs.filter(isAditivo);
  return {
    original: progressoGrupo(originais),
    aditivo: progressoGrupo(aditivos),
    temAditivos: aditivos.length > 0,
    pesoOriginal: originais.reduce((s, a) => s + (a.peso || 0), 0),
    pesoAditivo: aditivos.reduce((s, a) => s + (a.peso || 0), 0),
  };
}

/** Número do "% executado" (escopo original). */
export const calcularProgressoOriginal = (ativs: AtividadeProgresso[]) => calcularProgressoEscopo(ativs).original;
