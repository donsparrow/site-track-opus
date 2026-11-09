import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAnexoUrl } from '@/lib/anexoUrl';
import { painelKeys } from '../queryKeys';

export interface DiarioResumo {
  id: string;
  data: string;
  resumo: string;
  foto: string | null;
  paralisacao: string | null;
}

/** 5 diários mais recentes com resumo, primeira foto e paralisação. */
export function useDiariosRecentes(obraId: string) {
  return useQuery({
    queryKey: painelKeys.diarios(obraId),
    enabled: !!obraId,
    queryFn: async (): Promise<DiarioResumo[]> => {
      const { data, error } = await supabase
        .from('diario_obra')
        .select('id, data, observacoes_gerais, diario_atividades(descricao), diario_paralisacoes(motivo), diario_imagens(url, created_at)')
        .eq('obra_id', obraId)
        .order('data', { ascending: false })
        .limit(5);
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (d) => {
          const imgs = [...(d.diario_imagens ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
          const atividades = (d.diario_atividades ?? []).map((a) => a.descricao).filter(Boolean);
          const resumo = atividades.length ? atividades.join(' · ') : d.observacoes_gerais || 'Sem descrição registrada.';
          return {
            id: d.id,
            data: d.data,
            resumo,
            foto: imgs[0] ? (await resolveAnexoUrl(imgs[0].url)) || null : null,
            paralisacao: d.diario_paralisacoes?.[0]?.motivo ?? null,
          };
        }),
      );
    },
  });
}
