import { supabase } from '@/integrations/supabase/client';

export interface EmpresaBranding {
  nome_empresa: string | null;
  logo_url: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  instagram: string | null;
  texto_rodape: string | null;
}

/**
 * Busca os dados institucionais públicos da empresa via RPC segura.
 * Disponível para todos os papéis (inclusive síndico/cliente) e nunca
 * expõe endereço ou dados do responsável legal.
 */
export async function fetchEmpresaBranding(): Promise<EmpresaBranding | null> {
  const { data } = await supabase.rpc('get_empresa_branding');
  const row = (Array.isArray(data) ? data[0] : null) as Partial<EmpresaBranding> | null;
  if (!row) return null;
  return {
    nome_empresa: row.nome_empresa ?? null,
    logo_url: row.logo_url ?? null,
    cnpj: row.cnpj ?? null,
    telefone: row.telefone ?? null,
    email: row.email ?? null,
    site: row.site ?? null,
    instagram: row.instagram ?? null,
    texto_rodape: row.texto_rodape ?? null,
  };
}

/**
 * Configuração completa da empresa quando o papel tem permissão;
 * caso contrário devolve os dados institucionais públicos para
 * cabeçalhos de PDF e telas institucionais.
 */
export async function fetchEmpresaConfigOrBranding<T extends Record<string, unknown>>(): Promise<T | null> {
  const { data } = await supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle();
  if (data) return data as unknown as T;
  const branding = await fetchEmpresaBranding();
  return branding ? (branding as unknown as T) : null;
}
