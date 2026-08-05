import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAnexoUrl } from '@/lib/anexoUrl';
import { diarioKeys } from '../queryKeys';
import type { DiarioDetalhado, DiarioImagem } from '../types';

/**
 * Carrega o diário e TODAS as sub-entidades numa única query aninhada,
 * já resolvendo as URLs assinadas das imagens.
 */
export function useDiarioDetail(diarioId: string | null) {
  const query = useQuery({
    queryKey: diarioKeys.diario(diarioId),
    enabled: !!diarioId,
    queryFn: async (): Promise<DiarioDetalhado> => {
      const { data, error } = await supabase
        .from('diario_obra')
        .select(
          `*,
           diario_equipe(*),
           diario_atividades(*),
           diario_materiais(*),
           diario_ocorrencias(*),
           diario_paralisacoes(*),
           diario_imagens(*)`,
        )
        .eq('id', diarioId!)
        .single();
      if (error) throw error;

      const raw = data as unknown as DiarioDetalhado;
      const imagens = [...(raw.diario_imagens || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      const imagensResolvidas: DiarioImagem[] = await Promise.all(
        imagens.map(async (img) => ({ ...img, url: (await resolveAnexoUrl(img.url)) || img.url })),
      );

      return {
        ...raw,
        diario_equipe: raw.diario_equipe || [],
        diario_atividades: raw.diario_atividades || [],
        diario_materiais: raw.diario_materiais || [],
        diario_ocorrencias: raw.diario_ocorrencias || [],
        diario_paralisacoes: raw.diario_paralisacoes || [],
        diario_imagens: imagensResolvidas,
      };
    },
  });

  return { ...query, diario: query.data ?? null };
}
