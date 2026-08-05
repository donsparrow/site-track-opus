import type { Tables } from '@/integrations/supabase/types';

export type Receita = Tables<'receitas'>;
export type Despesa = Tables<'despesas'>;
export type Parcela = Tables<'parcelas'>;
export type FinanceiroAnexo = Tables<'financeiro_anexos'>;

/** Obra reduzida usada no filtro do módulo. */
export interface ObraOption {
  id: string;
  nome: string;
}

export type ReceitaComObra = Receita & { obras: { nome: string } | null };
export type DespesaComObra = Despesa & { obras: { nome: string } | null };

/** Linha crua retornada pela query de parcelas recebidas (com join). */
export type ParcelaComReceita = Parcela & {
  receitas: {
    descricao: string;
    obra_id: string;
    obras: { nome: string } | null;
  } | null;
};

/** Formato consumido pelo componente de Extrato. */
export interface ParcelaRecebidaExtrato {
  id: string;
  valor: number;
  data_recebimento: string;
  receita_descricao: string;
  obra_nome: string;
}

export type TipoRegistroAnexo = 'receita' | 'despesa';

export type StatusParcela = 'recebido' | 'atrasado' | 'pendente';
