import type { Tables } from '@/integrations/supabase/types';

export type Diario = Tables<'diario_obra'>;
export type DiarioEquipe = Tables<'diario_equipe'>;
export type DiarioAtividade = Tables<'diario_atividades'>;
export type DiarioMaterial = Tables<'diario_materiais'>;
export type DiarioOcorrencia = Tables<'diario_ocorrencias'>;
export type DiarioParalisacao = Tables<'diario_paralisacoes'>;
export type DiarioImagem = Tables<'diario_imagens'>;

/** Obra reduzida usada no seletor do módulo. */
export interface ObraDiario {
  id: string;
  nome: string;
  prazo_contratual_dias: number | null;
}

/** Atividade do cronograma disponível para vínculo. */
export interface CronogramaAtividadeOption {
  id: string;
  nome_atividade: string;
  percentual_concluido: number;
  peso: number;
}

/** Diário com todas as sub-entidades carregadas numa única query. */
export interface DiarioDetalhado extends Diario {
  diario_equipe: DiarioEquipe[];
  diario_atividades: DiarioAtividade[];
  diario_materiais: DiarioMaterial[];
  diario_ocorrencias: DiarioOcorrencia[];
  diario_paralisacoes: DiarioParalisacao[];
  /** Imagens ordenadas por created_at, com `url` já resolvida em signed URL. */
  diario_imagens: DiarioImagem[];
}

export interface DiarioFormValues {
  data: string;
  clima: string;
  temperatura: string;
  horario_inicio: string;
  horario_fim: string;
  observacoes_gerais: string;
}
