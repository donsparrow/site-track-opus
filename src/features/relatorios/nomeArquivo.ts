import { supabase } from '@/integrations/supabase/client';

export interface AssinaturaEmissao {
  tipo?: string | null;
  assinado_em?: string | null;
  data_assinatura?: string | null;
}
export interface VersaoEmissao {
  numero_versao: number;
  data_criacao: string;
}

export function sanitizarNomeObra(nome: string): string {
  const s = (nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || 'Obra';
}

export function formatarNumero(n: number): string {
  return String(n).padStart(2, '0');
}

/** Mesma regra da capa: v2 && maiorVersao > 0 ? maiorVersao - 1 : revisao. */
export function calcularRev({ versoes, revisao, versaoLayout = 1 }: { versoes: VersaoEmissao[]; revisao: number; versaoLayout?: number }): number {
  const maiorVersao = (versoes || []).reduce((m, v) => Math.max(m, v.numero_versao), 0);
  return versaoLayout >= 2 && maiorVersao > 0 ? maiorVersao - 1 : revisao;
}

function dataAssinatura(a: AssinaturaEmissao): Date | null {
  if (a.assinado_em) return new Date(a.assinado_em);
  if (a.data_assinatura) {
    const d = a.data_assinatura;
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  }
  return null;
}

export function calcularEmissao({ assinaturas, versoes, revisao, versaoLayout = 1 }: {
  assinaturas: AssinaturaEmissao[]; versoes: VersaoEmissao[]; revisao: number; versaoLayout?: number;
}): { rev: number; data: Date | null } {
  const rev = calcularRev({ versoes, revisao, versaoLayout });
  if (rev > 0) {
    const ultima = [...(versoes || [])].sort((a, b) => b.numero_versao - a.numero_versao)[0];
    return { rev, data: ultima ? new Date(ultima.data_criacao) : null };
  }
  const datas = (assinaturas || [])
    .filter((a) => a.tipo === 'responsavel_tecnico')
    .map(dataAssinatura)
    .filter((d): d is Date => !!d && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return { rev, data: datas[0] ?? null };
}

const p2 = (n: number) => String(n).padStart(2, '0');

export function montarNomeArquivoRelatorio({ nomeObra, numero, rev, data }: {
  nomeObra: string; numero?: number | null; rev: number; data: Date | null;
}): string {
  const base = `${sanitizarNomeObra(nomeObra)} - Relatorio${numero ? ` ${formatarNumero(numero)}` : ''}`;
  if (!data) return `${base} - minuta.pdf`;
  const d = `${p2(data.getDate())}-${p2(data.getMonth() + 1)}-${data.getFullYear()}`;
  return rev > 0 ? `${base} - REV ${p2(rev)} - ${d}.pdf` : `${base} - ${d}.pdf`;
}

export function textoDataEmissao(data: Date | null): string {
  return data ? data.toLocaleDateString('pt-BR') : 'Aguardando assinatura do RT';
}

export async function buscarNumerosRelatorios(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  try {
    const { data, error } = await supabase.rpc('relatorios_numeros', { p_ids: ids });
    if (error) throw error;
    for (const r of data || []) out[r.relatorio_id] = r.numero;
  } catch (e) {
    console.warn('Não foi possível obter o número do relatório:', e);
  }
  return out;
}

export async function nomeArquivoRelatorioPorId(relatorioId: string): Promise<string> {
  const [relRes, versRes, assRes, numeros] = await Promise.all([
    supabase.from('relatorios').select('revisao_pdf, versao_layout, obras(nome)').eq('id', relatorioId).maybeSingle(),
    supabase.from('relatorio_versoes').select('numero_versao, data_criacao').eq('relatorio_id', relatorioId),
    supabase.from('assinaturas').select('*').eq('relatorio_id', relatorioId),
    buscarNumerosRelatorios([relatorioId]),
  ]);
  if (relRes.error) throw relRes.error;
  const rel = relRes.data as { revisao_pdf?: number | null; versao_layout?: number | null; obras?: { nome?: string | null } | null } | null;
  const { rev, data } = calcularEmissao({
    assinaturas: (assRes.data || []) as AssinaturaEmissao[],
    versoes: (versRes.data || []) as VersaoEmissao[],
    revisao: rel?.revisao_pdf || 0,
    versaoLayout: rel?.versao_layout ?? 1,
  });
  return montarNomeArquivoRelatorio({ nomeObra: rel?.obras?.nome || '', numero: numeros[relatorioId], rev, data });
}
