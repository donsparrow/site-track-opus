import { supabase } from '@/integrations/supabase/client';

export interface EmpresaBranding {
  nome_empresa: string | null;
  logo_url: string | null;
}

/**
 * Busca apenas nome + logo da empresa via RPC segura.
 * Disponível para todos os papéis (inclusive síndico/cliente),
 * sem expor dados sensíveis de `configuracoes_empresa`.
 */
export async function fetchEmpresaBranding(): Promise<EmpresaBranding | null> {
  const { data } = await supabase.rpc('get_empresa_branding');
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return { nome_empresa: row.nome_empresa ?? null, logo_url: row.logo_url ?? null };
}

/**
 * Configuração completa da empresa quando o papel tem permissão;
 * caso contrário devolve o branding mínimo (nome + logo) para
 * cabeçalhos de PDF e telas institucionais.
 */
export async function fetchEmpresaConfigOrBranding<T extends Record<string, unknown>>(): Promise<T | null> {
  const { data } = await supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle();
  if (data) return data as unknown as T;
  const branding = await fetchEmpresaBranding();
  return branding ? (branding as unknown as T) : null;
}
