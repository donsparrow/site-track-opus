import type { DespesaComObra, Parcela, ReceitaComObra, StatusParcela } from './types';

export const fmt = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const fmtData = (data?: string | null) =>
  data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export const tipoLabels: Record<string, string> = {
  material: 'Material',
  mao_obra: 'Mão de obra',
  ferramenta: 'Ferramenta',
  manutencao: 'Manutenção',
  outros: 'Outros',
};

export const somaReceitas = (receitas: ReceitaComObra[]) =>
  receitas.reduce((s, r) => s + Number(r.valor_total), 0);

export const somaDespesas = (despesas: DespesaComObra[]) =>
  despesas.reduce((s, d) => s + Number(d.valor), 0);

export const calcSaldo = (totalReceitas: number, totalDespesas: number) =>
  totalReceitas - totalDespesas;

export const statusParcela = (p: Parcela): StatusParcela => {
  const today = new Date().toISOString().split('T')[0];
  if (p.data_recebimento) return 'recebido';
  return p.data_vencimento < today ? 'atrasado' : 'pendente';
};
