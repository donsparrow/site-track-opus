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
  /** Cronograma usado no PDF no momento do snapshot. */
  cronograma?: SnapshotCronogramaItem[];
  /** Número da barra "Progresso Geral" do PDF. */
  progresso_geral?: number;
  /** Número "Progresso Físico" (= prazos.percentualExecutado). */
  progresso_fisico?: number;
  /** true quando `prazos` foi capturado no estado congelado (assinatura). */
  prazos_congelados?: boolean;
  /** Aditivos congelados na assinatura (ausente em snapshots legados). */
  aditivos?: SnapshotAditivo[];
}

export interface SnapshotAditivo {
  id: string;
  descricao: string;
  dias_adicionais: number;
  data_aprovacao: string | null;
  responsavel_aprovacao: string | null;
  justificativa: string | null;
}

export interface SnapshotCronogramaItem {
  nome_atividade: string;
  peso: number | null;
  percentual_concluido: number;
  status: string;
  tipo_atividade: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  aditivo_id?: string | null;
}

export interface PeriodoRelatorio {
  inicio: string;
  fim: string;
}

export type ViewMode = 'list' | 'edit';
