/** Utilidades do Painel da Obra. */

export const fmtDataCurta = (iso?: string | null) =>
  iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export const fmtDiaMes = (iso?: string | null) =>
  iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';

export const fmtMoeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/** Data (YYYY-MM-DD) do n-ésimo dia útil contando a partir de `inicio` (inclusivo). n=1 → o próprio início se for útil. */
export function dataNoDiaUtil(inicio: string, n: number): string | null {
  if (!inicio || !(n >= 1)) return null;
  const cur = new Date(inicio + 'T00:00:00');
  if (isNaN(cur.getTime())) return null;
  let count = 0;
  for (let guard = 0; guard < 20000; guard++) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) {
      count++;
      if (count === n) {
        return `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

export type SituacaoParcela = 'pago' | 'vencida' | 'a_vencer';

export function situacaoParcela(p: { data_recebimento: string | null; data_vencimento: string }, hoje: string): SituacaoParcela {
  if (p.data_recebimento) return 'pago';
  return p.data_vencimento < hoje ? 'vencida' : 'a_vencer';
}
