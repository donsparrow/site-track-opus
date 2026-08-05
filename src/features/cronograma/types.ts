import type { Tables } from '@/integrations/supabase/types';

export type Cronograma = Tables<'cronograma'>;
export type Atividade = Tables<'cronograma_atividades'>;
export type Aditivo = Tables<'obra_aditivos'>;

/** Obra reduzida usada no seletor do módulo. */
export interface ObraOption {
  id: string;
  nome: string;
}

export interface EmpresaConfigPdf {
  [key: string]: unknown;
}

export const statusLabels: Record<string, string> = {
  nao_iniciado: 'Não Iniciado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};

export const statusColors: Record<string, string> = {
  nao_iniciado: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  concluido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

export interface AtividadeFormData {
  nome_atividade: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  percentual_concluido: number;
  status: string;
  peso: number;
  tipo_atividade: string;
  observacoes: string;
}

export interface AditivoFormData {
  descricao: string;
  dias_adicionais: number;
  data_aprovacao: string;
  justificativa: string;
  responsavel_aprovacao: string;
  documento_url: string;
}
