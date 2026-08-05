import type { Tables } from '@/integrations/supabase/types';

export type Pasta = Tables<'documentos_pastas'>;
export type Arquivo = Tables<'documentos_arquivos'>;

/** Obra reduzida usada no filtro do módulo. */
export interface ObraOption {
  id: string;
  nome: string;
}

export type TipoArquivo = 'imagem' | 'pdf';
