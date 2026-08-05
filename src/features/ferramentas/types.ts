import type { Tables } from '@/integrations/supabase/types';

export type Ferramenta = Tables<'ferramentas'>;
export type FerramentaHistorico = Tables<'ferramentas_historico'>;

/** Obra reduzida usada nos filtros e vínculos do módulo. */
export interface ObraOption {
  id: string;
  nome: string;
  status?: string;
}

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  disponivel: { label: 'Disponível', color: 'bg-primary-muted' },
  em_uso: { label: 'Em Uso', color: 'bg-success' },
  manutencao: { label: 'Manutenção', color: 'bg-warning' },
  inativo: { label: 'Inativo', color: 'bg-destructive' },
};

export const TIPO_LABELS: Record<string, string> = {
  manual: 'Manual',
  eletrica: 'Elétrica',
  medicao: 'Medição',
};

export interface FerramentaFormValues {
  nome: string;
  numeroCadastro: string;
  tipo: string;
  status: string;
  obraId: string;
  voltagem: string;
}

export interface ManutencaoFormValues {
  data: string;
  valor: string;
  local: string;
  anexo: File | null;
}
