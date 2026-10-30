import { supabase } from '@/integrations/supabase/client';
import { carregarDadosRelatorio } from '@/lib/relatorioDados';
import { aplicarIndicadoresCongelados } from './indicadores';
import { gerarPDFRelatorio, type GerarPdfArgs } from './pdf';
import type { Assinatura, EmpresaConfig, ObraRelatorio, Relatorio, RelatorioVersao } from './types';
import type { Tables } from '@/integrations/supabase/types';

export type PdfArquivado = Tables<'relatorio_pdfs_assinados'>;

const BUCKET = 'relatorios-assinados';

/** Versão do layout do PDF (1 = legado). Sem relatório salvo → layout novo. */
export async function getVersaoLayout(relatorioId: string | null): Promise<number> {
  if (!relatorioId) return 2;
  const { data } = await supabase.from('relatorios').select('versao_layout').eq('id', relatorioId).maybeSingle();
  return (data as { versao_layout?: number } | null)?.versao_layout ?? 1;
}

/** Nome de exibição do arquivo — mesmo padrão do download gerado na hora. */
export function nomeArquivoPdf(nomeObra: string): string {
  const hoje = new Date();
  const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
  const nome = nomeObra.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `relatorio_${nome}_${dataFormatada}.pdf`;
}

/**
 * Monta o payload do PDF a partir do relatório salvo — mesma montagem que
 * o download pela lista sempre fez (dados congelados têm precedência).
 */
export async function montarArgsPdf(
  relatorio: Pick<Relatorio, 'id' | 'obra_id' | 'data_inicio' | 'data_fim' | 'revisao_pdf'> & Record<string, unknown>,
  empresa: EmpresaConfig | null,
): Promise<GerarPdfArgs> {
  const { data: obra } = await supabase
    .from('obras')
    .select('*, clientes(nome, cpf_cnpj, email, telefone)')
    .eq('id', relatorio.obra_id)
    .maybeSingle();
  if (!obra) throw new Error('Obra do relatório não encontrada');

  const dadosBrutos = await carregarDadosRelatorio(
    relatorio.obra_id,
    relatorio.data_inicio || '',
    relatorio.data_fim || '',
    { relatorioId: relatorio.id },
  );
  // Documento imutável: indicadores congelados no fechamento têm precedência.
  const dados = aplicarIndicadoresCongelados(dadosBrutos, relatorio as Relatorio);

  const [assinRes, versRes] = await Promise.all([
    supabase.from('assinaturas').select('*').eq('relatorio_id', relatorio.id).order('data_assinatura'),
    supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorio.id).order('numero_versao', { ascending: false }),
  ]);

  const versaoLayout = await getVersaoLayout(relatorio.id);

  return {
    versaoLayout,
    empresa,
    obra: obra as unknown as ObraRelatorio,
    periodo: { inicio: relatorio.data_inicio || '', fim: relatorio.data_fim || '' },
    dados,
    assinaturas: (assinRes.data || []) as Assinatura[],
    versoes: (versRes.data || []) as RelatorioVersao[],
    revisao: relatorio.revisao_pdf || 0,
  };
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function stampAgora(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Gera o PDF do relatório assinado em memória, sem arquivar nada.
 * Retorna o relatório, os args usados e o blob pronto para download.
 */
export async function gerarPdfAssinadoBlob({
  relatorioId,
  empresa,
}: {
  relatorioId: string;
  empresa: EmpresaConfig | null;
}): Promise<{ relatorio: Relatorio; args: GerarPdfArgs; blob: Blob; fileName: string }> {
  const { data: rel, error: errRel } = await supabase
    .from('relatorios')
    .select('*')
    .eq('id', relatorioId)
    .maybeSingle();
  if (errRel) throw errRel;
  if (!rel) throw new Error('Relatório não encontrado');
  const relatorio = rel as Relatorio;
  if (relatorio.status !== 'assinado') throw new Error('Somente relatórios assinados podem ser arquivados');

  const args = await montarArgsPdf(relatorio, empresa);
  const resultado = await gerarPDFRelatorio(args, { saida: 'blob' });
  if (!resultado) throw new Error('Falha ao gerar o PDF');
  const { blob, fileName } = resultado;

  return { relatorio, args, blob, fileName };
}

/**
 * Arquiva um blob já gerado: upload no bucket + registro em
 * relatorio_pdfs_assinados + log. Não gera nem baixa o PDF.
 */
export async function arquivarBlob({
  relatorio,
  args,
  blob,
  origem,
}: {
  relatorio: Relatorio;
  args: GerarPdfArgs;
  blob: Blob;
  origem: 'assinatura' | 'arquivamento_posterior';
}): Promise<{ registro: PdfArquivado }> {
  const relatorioId = relatorio.id;
  const qtdAssinaturas = args.assinaturas.length;
  const storagePath = `${relatorio.empresa_id}/${relatorioId}/${stampAgora()}-${qtdAssinaturas}ass.pdf`;

  const { error: errUp } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false });
  if (errUp) throw errUp;

  const sha256 = await sha256Hex(blob);
  const versaoMaisRecente = args.versoes[0] ?? null;

  const { data: registro, error: errIns } = await supabase
    .from('relatorio_pdfs_assinados')
    .insert({
      relatorio_id: relatorioId,
      versao_id: versaoMaisRecente?.id ?? null,
      empresa_id: relatorio.empresa_id,
      storage_path: storagePath,
      sha256,
      tamanho_bytes: blob.size,
      qtd_assinaturas: qtdAssinaturas,
      origem,
    })
    .select()
    .single();
  if (errIns) throw errIns;

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase.from('relatorio_logs').insert({
      relatorio_id: relatorioId,
      usuario_id: userData.user.id,
      acao: origem === 'assinatura' ? 'arquivou PDF assinado' : 'arquivou PDF (arquivamento posterior)',
    });
  }

  return { registro: registro as PdfArquivado };
}

/**
 * Gera o PDF do relatório assinado, arquiva no bucket e registra em
 * relatorio_pdfs_assinados. Retorna o registro + o blob para download imediato.
 */
export async function arquivarPdfAssinado({
  relatorioId,
  empresa,
  origem,
}: {
  relatorioId: string;
  empresa: EmpresaConfig | null;
  origem: 'assinatura' | 'arquivamento_posterior';
}): Promise<{ registro: PdfArquivado; blob: Blob; fileName: string }> {
  const { relatorio, args, blob, fileName } = await gerarPdfAssinadoBlob({ relatorioId, empresa });
  const { registro } = await arquivarBlob({ relatorio, args, blob, origem });
  return { registro, blob, fileName };
}

export async function listarPdfsArquivados(relatorioId: string): Promise<PdfArquivado[]> {
  const { data, error } = await supabase
    .from('relatorio_pdfs_assinados')
    .select('*')
    .eq('relatorio_id', relatorioId)
    .order('gerado_em', { ascending: false });
  if (error) throw error;
  return (data || []) as PdfArquivado[];
}

/** Registro ativo mais recente, ou null se não houver. */
export async function buscarUltimoPdfArquivado(relatorioId: string): Promise<PdfArquivado | null> {
  const { data, error } = await supabase
    .from('relatorio_pdfs_assinados')
    .select('*')
    .eq('relatorio_id', relatorioId)
    .is('excluido_em', null)
    .order('gerado_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PdfArquivado | null) ?? null;
}

/** Dispara o download de um blob no navegador. */
export function baixarBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Baixa o arquivo guardado no bucket — nunca regenera o PDF. */
export async function baixarPdfArquivado(registro: PdfArquivado, fileName: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).download(registro.storage_path);
  if (error || !data) throw error || new Error('Arquivo não encontrado no armazenamento');
  baixarBlob(data, fileName);
}

export type ResultadoDownload = 'original' | 'arquivado_agora' | 'gerado_sem_arquivo';

/**
 * Fluxo de download de relatório assinado: o usuário SEMPRE recebe um PDF.
 * - Com registro vigente: tenta o original; se o download falhar, gera na hora
 *   e baixa SEM arquivar (uma falha nunca substitui o PDF vigente).
 * - Sem registro vigente: gera, baixa imediatamente e só depois tenta arquivar;
 *   falha no arquivamento não impede o download.
 * Só lança erro se a própria geração do PDF falhar.
 */
export async function baixarPdfAssinadoOuArquivar({
  relatorioId,
  empresa,
  nomeObra,
}: {
  relatorioId: string;
  empresa: EmpresaConfig | null;
  nomeObra: string;
}): Promise<ResultadoDownload> {
  const fileName = nomeArquivoPdf(nomeObra);

  let registro: PdfArquivado | null = null;
  try {
    registro = await buscarUltimoPdfArquivado(relatorioId);
  } catch (e) {
    console.warn('Falha ao consultar PDF arquivado; gerando sem arquivar:', e);
  }

  if (registro) {
    try {
      await baixarPdfArquivado(registro, fileName);
      return 'original';
    } catch (e) {
      console.warn('Falha ao baixar o PDF arquivado; gerando uma cópia sem arquivar:', e);
      const { blob, fileName: nome } = await gerarPdfAssinadoBlob({ relatorioId, empresa });
      baixarBlob(blob, nome);
      return 'gerado_sem_arquivo';
    }
  }

  const { relatorio, args, blob, fileName: nome } = await gerarPdfAssinadoBlob({ relatorioId, empresa });
  baixarBlob(blob, nome);

  try {
    await arquivarBlob({ relatorio, args, blob, origem: 'arquivamento_posterior' });
    return 'arquivado_agora';
  } catch (e) {
    console.warn('PDF baixado, mas falha ao arquivar:', e);
    return 'gerado_sem_arquivo';
  }
}

/**
 * Exclusão de administrador: marca o registro via RPC e remove o arquivo.
 * Falha na remoção do arquivo não desfaz a marcação (apenas aviso no console).
 */
export async function excluirPdfArquivado(registro: PdfArquivado, relatorioId: string): Promise<void> {
  const { error } = await supabase.rpc('excluir_pdf_assinado', { _id: registro.id });
  if (error) throw error;

  const { error: errRm } = await supabase.storage.from(BUCKET).remove([registro.storage_path]);
  if (errRm) console.warn('Registro marcado como excluído, mas falha ao remover o arquivo:', errRm);

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase.from('relatorio_logs').insert({
      relatorio_id: relatorioId,
      usuario_id: userData.user.id,
      acao: `excluiu PDF arquivado (SHA-256 ${registro.sha256.slice(0, 12)})`,
    });
  }
}
