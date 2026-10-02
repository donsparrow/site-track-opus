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
  /** 1 = layout legado; >= 2 = novo layout. */
  versaoLayout?: number;
}

/**
 * Único ponto de montagem do payload do PDF — o gerador (`pdfRelatorio.ts`)
 * não faz nenhum fetch: recebe os dados já carregados pelos hooks.
 * As assinaturas continuam resolvidas em URL assinada do bucket privado.
 */
export async function gerarPDFRelatorio({ empresa, obra, periodo, dados, assinaturas, versoes, revisao, versaoLayout = 1 }: GerarPdfArgs) {
  const v2 = versaoLayout >= 2;
  const maiorVersao = (versoes || []).reduce((m, v) => Math.max(m, v.numero_versao), 0);
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
    versao: v2 && maiorVersao > 0 ? maiorVersao - 1 : revisao,
    versaoLayout,
    versoes: (versoes || []).map((v) => ({
      rev: revLabel(v2 ? Math.max(0, v.numero_versao - 1) : v.numero_versao),
      data: new Date(v.data_criacao).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      resumo: v.descricao_alteracao || '—',
    })),
  });
}
