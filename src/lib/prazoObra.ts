/**
 * Regra canônica de PRAZO e PROGRESSO GLOBAL da obra (arquivo único).
 * Datas sempre 'YYYY-MM-DD' em horário local.
 */
import { calcBusinessDays } from '@/lib/dias';
import { calcularProgressoEscopo, type AtividadeProgresso } from '@/lib/progressoFisico';

const toDate = (d: string) => new Date(d + 'T00:00:00');
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isUtil = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export function prazoContratualBase(obra: {
  prazo_contratual_dias?: number | null;
  data_inicio?: string | null;
  data_fim_prevista?: string | null;
}): number {
  if ((obra.prazo_contratual_dias ?? 0) > 0) return obra.prazo_contratual_dias as number;
  if (obra.data_inicio && obra.data_fim_prevista) return calcBusinessDays(obra.data_inicio, obra.data_fim_prevista);
  return 0;
}

export function datasUteisParadas(
  paralisacoes: { data_inicio: string; data_fim?: string | null }[],
  inicio: string,
  corte: string,
): Set<string> {
  const out = new Set<string>();
  for (const p of paralisacoes) {
    if (!p.data_inicio) continue;
    const cur = toDate(p.data_inicio);
    const fim = toDate(p.data_fim || p.data_inicio);
    while (cur <= fim) {
      const s = fmt(cur);
      if (isUtil(cur) && s >= inicio && s <= corte) out.add(s);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return out;
}

export function diasUteisSemDiario(datasDiarios: string[], inicio: string, corte: string): string[] {
  if (corte < inicio) return [];
  const com = new Set(datasDiarios);
  const out: string[] = [];
  const cur = toDate(inicio);
  const fim = toDate(corte);
  while (cur <= fim) {
    const s = fmt(cur);
    if (isUtil(cur) && !com.has(s)) out.push(s);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export interface ProgressoPorAditivo { id: string; descricao: string; dias: number; progresso: number }

export function calcularProgressoGlobal(
  atividades: (AtividadeProgresso & { aditivo_id?: string | null })[],
  aditivos: { id: string; descricao: string; dias_adicionais: number }[],
  prazoContratual: number,
) {
  const contrato = calcularProgressoEscopo(atividades).original;
  const atividadesSemVinculo = atividades.filter(a => a.tipo_atividade === 'aditivo' && !a.aditivo_id).length;
  const porAditivo: ProgressoPorAditivo[] = aditivos.map(ad => {
    const ativs = atividades.filter(a => a.aditivo_id === ad.id);
    return {
      id: ad.id,
      descricao: ad.descricao,
      dias: ad.dias_adicionais || 0,
      progresso: ativs.length ? calcularProgressoEscopo(ativs).aditivo : 0,
    };
  });
  const somaDias = porAditivo.reduce((s, a) => s + a.dias, 0);
  const somaPD = porAditivo.reduce((s, a) => s + a.progresso * a.dias, 0);
  const aditivosPct = somaDias > 0 ? clamp(somaPD / somaDias) : 0;
  const denom = prazoContratual + somaDias;
  const global = !aditivos.length || denom === 0 ? contrato : clamp((contrato * prazoContratual + somaPD) / denom);
  return { contrato, aditivos: aditivosPct, global, porAditivo, atividadesSemVinculo };
}

export function calcularPrazoConsumido(diasDecorridos: number, diasParados: number, prazoEfetivo: number) {
  const diasConsumidos = Math.max(0, diasDecorridos - diasParados);
  const percentual = prazoEfetivo > 0 ? Math.round((diasConsumidos / prazoEfetivo) * 100) : 0;
  return { diasConsumidos, percentual };
}
