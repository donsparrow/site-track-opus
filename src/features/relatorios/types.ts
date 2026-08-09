import type { Tables } from '@/integrations/supabase/types';
import type { PrazosRelatorio, DadosRelatorio } from '@/lib/relatorioDados';

export type Relatorio = Tables<'relatorios'>;
export type RelatorioVersao = Tables<'relatorio_versoes'>;
export type RelatorioLog = Tables<'relatorio_logs'>;
export type Assinatura = Tables<'assinaturas'>;
export type EmpresaConfig = Tables<'configuracoes_empresa'>;

export type { PrazosRelatorio, DadosRelatorio };

export interface ClienteResumo {
  nome: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
}

/** Obra reduzida usada nos filtros e no cabeçalho do relatório. */
export interface ObraRelatorio {
  id: string;
  nome: string;
  data_inicio: string | null;
  data_fim_prevista: string | null;
  endereco: string | null;
  responsavel_tecnico: string | null;
  crea_cau: string | null;
  prazo_contratual_dias: number | null;
  clientes: ClienteResumo | null;
}

export type RelatorioComObra = Relatorio & {
  obras: { nome: string; clientes: { nome: string } | null } | null;
};

/** Snapshot de conteúdo usado para versionamento. */
export interface SnapshotDados {
  prazos: PrazosRelatorio;
  periodo: { inicio: string; fim: string };
  diarios_count: number;
  equipe_count: number;
  atividades_count: number;
  materiais_count: number;
  ocorrencias_count: number;
  paralisacoes_count: number;
  imagens_count: number;
}

export interface PeriodoRelatorio {
  inicio: string;
  fim: string;
}

export type ViewMode = 'list' | 'edit';
