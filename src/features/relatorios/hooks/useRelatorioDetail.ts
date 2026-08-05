import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { carregarDadosRelatorio } from '@/lib/relatorioDados';
import { resolveAnexoUrl } from '@/lib/anexoUrl';
import { relatoriosKeys } from '../queryKeys';
import type { Assinatura, DadosRelatorio, Relatorio } from '../types';
import { dadosVazios } from '../utils';

/** Dados consolidados do período (diários, equipe, atividades, imagens, prazos...). */
export function useRelatorioDados(params: {
  obraId: string;
  inicio: string;
  fim: string;
  relatorioId: string | null;
}) {
  const { obraId, inicio, fim, relatorioId } = params;

  const query = useQuery({
    queryKey: relatoriosKeys.dados(obraId, inicio, fim, relatorioId),
    enabled: !!obraId && !!inicio && !!fim,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<DadosRelatorio> =>
      carregarDadosRelatorio(obraId, inicio, fim, { relatorioId }),
  });

  return { ...query, dados: query.data ?? dadosVazios };
}

/** Relatório (linha) + assinaturas, com URLs assinadas resolvidas para exibição. */
export function useRelatorioDetail(relatorioId: string | null) {
  const relatorioQuery = useQuery({
    queryKey: relatoriosKeys.detalhe(relatorioId),
    enabled: !!relatorioId,
    queryFn: async (): Promise<Relatorio | null> => {
      const { data, error } = await supabase.from('relatorios').select('*').eq('id', relatorioId!).maybeSingle();
      if (error) throw error;
      return (data as Relatorio) ?? null;
    },
  });

  const assinaturasQuery = useQuery({
    queryKey: relatoriosKeys.assinaturas(relatorioId),
    enabled: !!relatorioId,
    queryFn: async (): Promise<Assinatura[]> => {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('relatorio_id', relatorioId!)
        .order('data_assinatura');
      if (error) throw error;
      return (data || []) as Assinatura[];
    },
  });

  const assinaturas = assinaturasQuery.data ?? [];

  const urlsQuery = useQuery({
    queryKey: ['relatorio-assinaturas-urls', assinaturas.map((a) => a.id).join(',')],
    enabled: assinaturas.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const entries = await Promise.all(
        assinaturas.map(async (a) => [a.id, (await resolveAnexoUrl(a.assinatura_url)) || ''] as const),
      );
      return Object.fromEntries(entries);
    },
  });

  return {
    relatorio: relatorioQuery.data ?? null,
    assinaturas,
    assinaturaUrls: urlsQuery.data ?? {},
    isPending: relatorioQuery.isPending || assinaturasQuery.isPending,
    isError: relatorioQuery.isError || assinaturasQuery.isError,
    refetch: () => { relatorioQuery.refetch(); assinaturasQuery.refetch(); },
  };
}
