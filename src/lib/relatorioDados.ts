import { supabase } from '@/integrations/supabase/client';

export function calcBusinessDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export interface PrazosRelatorio {
  contratual: number;
  parados: number;
  ajustado: number;
  trabalhados: number;
  saldo: number;
  dataInicioReal: string;
  percentualTempo: number;
  percentualExecutado: number;
}

export interface DadosRelatorio {
  diarios: any[];
  equipe: any[];
  atividades: any[];
  materiais: any[];
  ocorrencias: any[];
  imagens: any[];
  paralisacoes: any[];
  cronograma: any[];
  aditivos: any[];
  planejamentoConfigurado: boolean;
  prazos: PrazosRelatorio;
}

/**
 * Carrega e consolida todos os dados necessários para exibir/gerar um relatório.
 * Usado tanto na tela de edição quanto no download direto pela listagem,
 * garantindo que o PDF seja idêntico nos dois caminhos.
 */
export async function carregarDadosRelatorio(
  obraId: string,
  inicio: string,
  fim: string,
  opts?: { relatorioId?: string | null },
): Promise<DadosRelatorio> {
  // Diários: prioriza os vinculados ao relatório, com fallback pelo período
  let dList: any[] = [];
  if (opts?.relatorioId) {
    const { data } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('relatorio_id', opts.relatorioId)
      .order('data');
    dList = data || [];
  }
  if (dList.length === 0 && inicio && fim) {
    const { data } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', obraId)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data');
    dList = data || [];
  }

  const diarioIds = dList.map((d) => d.id);
  const empty = { data: [] } as any;

  const [eq, at, mt, oc, im, pa] = diarioIds.length
    ? await Promise.all([
        supabase.from('diario_equipe').select('*').in('diario_id', diarioIds),
        supabase.from('diario_atividades').select('*').in('diario_id', diarioIds),
        supabase.from('diario_materiais').select('*').in('diario_id', diarioIds),
        supabase.from('diario_ocorrencias').select('*').in('diario_id', diarioIds),
        supabase.from('diario_imagens').select('*').in('diario_id', diarioIds),
        supabase.from('diario_paralisacoes').select('*').in('diario_id', diarioIds),
      ])
    : [empty, empty, empty, empty, empty, empty];

  // Cronograma da obra
  const { data: cronData } = await supabase
    .from('cronograma')
    .select('id')
    .eq('obra_id', obraId)
    .maybeSingle();

  let cronogramaAtivs: any[] = [];
  if (cronData) {
    const { data: cr } = await supabase
      .from('cronograma_atividades')
      .select('nome_atividade, data_inicio, data_fim, percentual_concluido, status, peso, tipo_atividade')
      .eq('cronograma_id', cronData.id)
      .order('ordem');
    cronogramaAtivs = cr || [];
  }
  const planejamentoConfigurado = cronogramaAtivs.length > 0;

  // Primeiro diário da obra (não apenas do período) = início real
  const { data: primeiroDiario } = await supabase
    .from('diario_obra')
    .select('data')
    .eq('obra_id', obraId)
    .order('data', { ascending: true })
    .limit(1)
    .maybeSingle();
  const dataInicioReal = primeiroDiario?.data || '';

  // Prazo contratual da obra + aditivos
  const { data: obra } = await supabase
    .from('obras')
    .select('prazo_contratual_dias, data_inicio, data_fim_prevista')
    .eq('id', obraId)
    .maybeSingle();

  const prazoContratualBase =
    obra?.prazo_contratual_dias && obra.prazo_contratual_dias > 0
      ? obra.prazo_contratual_dias
      : obra?.data_inicio && obra?.data_fim_prevista
        ? calcBusinessDays(obra.data_inicio, obra.data_fim_prevista)
        : 0;

  const { data: aditivosRows } = await supabase
    .from('obra_aditivos' as any)
    .select('*')
    .eq('obra_id', obraId);
  const aditivos = (aditivosRows as any[]) || [];
  const diasAditivos = aditivos.reduce((s, a) => s + (a.dias_adicionais || 0), 0);
  const prazoContratual = prazoContratualBase + diasAditivos;

  const diasParados = (pa.data || []).reduce((s: number, p: any) => s + (p.total_dias || 0), 0);
  const diasTrabalhados = dataInicioReal && fim ? calcBusinessDays(dataInicioReal, fim) : 0;
  const prazoAjustado = prazoContratual + diasParados;
  const saldoPrazo = prazoAjustado - diasTrabalhados;
  const percentualTempo = prazoContratual > 0 ? Math.round((diasTrabalhados / prazoContratual) * 100) : 0;

  let percentualExecutado = 0;
  if (cronogramaAtivs.length > 0) {
    const totalPeso = cronogramaAtivs.reduce((s: number, c: any) => s + (c.peso || 0), 0);
    percentualExecutado =
      totalPeso > 0
        ? Math.round(
            cronogramaAtivs.reduce((s: number, c: any) => s + (c.peso || 0) * (c.percentual_concluido || 0), 0) /
              Math.max(totalPeso, 1),
          )
        : Math.round(
            cronogramaAtivs.reduce((s: number, c: any) => s + (c.percentual_concluido || 0), 0) / cronogramaAtivs.length,
          );
  }

  return {
    diarios: dList,
    equipe: eq.data || [],
    atividades: at.data || [],
    materiais: mt.data || [],
    ocorrencias: oc.data || [],
    imagens: im.data || [],
    paralisacoes: pa.data || [],
    cronograma: cronogramaAtivs,
    aditivos,
    planejamentoConfigurado,
    prazos: {
      contratual: prazoContratual,
      parados: diasParados,
      ajustado: prazoAjustado,
      trabalhados: diasTrabalhados,
      saldo: saldoPrazo,
      dataInicioReal,
      percentualTempo,
      percentualExecutado,
    },
  };
}
