/** Regras de cálculo das parcelas de receita (sem dependências de UI). */

export const TOLERANCIA = 0.005;

export interface ParcelaRascunho {
  valor: number;
  data_vencimento: string;
}

const centavos = (v: number) => Math.round(v * 100);

/** Data local de hoje em YYYY-MM-DD. */
export function hojeISO(base: Date = new Date()): string {
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Soma `dias` a uma data YYYY-MM-DD. */
export function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return hojeISO(new Date(y, m - 1, d + dias));
}

/** Divide o total em n parcelas iguais; a última absorve a diferença de centavos. Vencimentos hoje+30, +60... */
export function gerarParcelas(total: number, n: number, hoje: string = hojeISO()): ParcelaRascunho[] {
  if (!(total > 0) || !(n >= 1)) return [];
  const totalC = centavos(total);
  const base = Math.floor(totalC / n);
  return Array.from({ length: n }, (_, i) => ({
    valor: (i === n - 1 ? totalC - base * (n - 1) : base) / 100,
    data_vencimento: somarDias(hoje, 30 * (i + 1)),
  }));
}

export function somaValores(valores: number[]): number {
  return valores.reduce((s, v) => s + centavos(Number(v) || 0), 0) / 100;
}

/** Saldo não parcelado = total − soma das parcelas (nunca negativo para exibição). */
export function saldoNaoParcelado(total: number, valores: number[]): number {
  return Math.max(0, (centavos(total) - centavos(somaValores(valores))) / 100);
}

/** Máximo permitido para uma parcela = total − soma das demais. */
export function maximoParcela(total: number, somaDemais: number): number {
  return Math.max(0, (centavos(total) - centavos(somaDemais)) / 100);
}

/** Vencimento sugerido para a parcela de saldo: maior vencimento + 30 dias (ou hoje + 30). */
export function vencimentoSugerido(vencimentos: string[], hoje: string = hojeISO()): string {
  const maior = vencimentos.filter(Boolean).sort().at(-1);
  return somarDias(maior ?? hoje, 30);
}
