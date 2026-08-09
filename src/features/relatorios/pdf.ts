import { gerarRelatorioPDF } from '@/lib/pdfRelatorio';
import { resolveAssinaturas } from '@/lib/anexoUrl';
import type { Assinatura, DadosRelatorio, EmpresaConfig, ObraRelatorio, RelatorioVersao } from './types';
import { revLabel } from './utils';

interface ObraPdf {
  nome: string;
  endereco?: string | null;
  responsavel_tecnico?: string | null;
  crea_cau?: string | null;
  clientes?: { nome?: string | null; cpf_cnpj?: string | null; email?: string | null; telefone?: string | null } | null;
}

export interface GerarPdfArgs {
  empresa: EmpresaConfig | null;
  obra: ObraPdf | ObraRelatorio;
  periodo: { inicio: string; fim: string };
  dados: DadosRelatorio;
  assinaturas: Assinatura[];
  versoes: RelatorioVersao[];
  revisao: number;
}

/**
 * Único ponto de montagem do payload do PDF — o gerador (`pdfRelatorio.ts`)
 * não faz nenhum fetch: recebe os dados já carregados pelos hooks.
 * As assinaturas continuam resolvidas em URL assinada do bucket privado.
 */
export async function gerarPDFRelatorio({ empresa, obra, periodo, dados, assinaturas, versoes, revisao }: GerarPdfArgs) {
  await gerarRelatorioPDF({
    empresa: empresa || null,
    obra: {
      nome: obra.nome,
      endereco: obra.endereco || '',
      responsavel: obra.responsavel_tecnico || '',
      crea_cau: obra.crea_cau || '',
      cliente_nome: obra.clientes?.nome || '',
      cliente_cpf_cnpj: obra.clientes?.cpf_cnpj || '',
      cliente_email: obra.clientes?.email || '',
      cliente_telefone: obra.clientes?.telefone || '',
    },
    periodo,
    prazos: dados.prazos,
    diarios: dados.diarios,
    equipe: dados.equipe,
    atividades: dados.atividades,
    materiais: dados.materiais,
    ocorrencias: dados.ocorrencias,
    paralisacoes: dados.paralisacoes,
    imagens: dados.imagens,
    cronograma: dados.cronograma,
    aditivos: dados.aditivos,
    planejamentoConfigurado: dados.planejamentoConfigurado,
    assinaturas: await resolveAssinaturas(assinaturas || []),
    versao: revisao,
    versoes: (versoes || []).map((v) => ({
      rev: revLabel(v.numero_versao),
      data: new Date(v.data_criacao).toLocaleDateString('pt-BR'),
      resumo: v.descricao_alteracao || '—',
    })),
  });
}
