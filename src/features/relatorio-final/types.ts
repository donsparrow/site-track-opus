import type { Tables } from '@/integrations/supabase/types';

export type RelatorioFinal = Tables<'relatorios_finais'>;
export type RelatorioFinalFoto = Tables<'relatorio_final_fotos'>;

export type TipoFoto = 'pre_obra' | 'pos_obra';

export interface ObraOption {
  id: string;
  nome: string;
  endereco: string | null;
  responsavel_tecnico: string | null;
  data_inicio: string | null;
  data_fim_prevista: string | null;
  clientes: { nome: string | null; cpf_cnpj: string | null } | null;
}

export const SECOES = [
  { key: 'introducao', titulo: 'titulo_introducao', conteudo: 'conteudo_introducao', label: 'Introdução' },
  { key: 'garantia', titulo: 'titulo_garantia', conteudo: 'conteudo_garantia', label: 'Garantia' },
  { key: 'aditivo', titulo: 'titulo_aditivo', conteudo: 'conteudo_aditivo', label: 'Aditivos' },
  { key: 'conclusao', titulo: 'titulo_conclusao', conteudo: 'conteudo_conclusao', label: 'Conclusão' },
] as const;
