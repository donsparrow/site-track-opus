import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractAnexoPath } from '@/lib/anexoUrl';
import type { ImagemRelatorio } from '../utils';

/** Resolve todas as URLs das fotos do relatório numa única chamada de URLs assinadas. */
export function useImagensRelatorio(imagens: ImagemRelatorio[]) {
  const ids = imagens.map((i) => i.id);
  return useQuery({
    queryKey: ['relatorio-imagens-urls', ids],
    enabled: imagens.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const mapa: Record<string, string> = {};
      const comPath: { id: string; path: string }[] = [];
      for (const img of imagens) {
        mapa[img.id] = img.url;
        const path = extractAnexoPath(img.url);
        if (path) comPath.push({ id: img.id, path });
      }
      if (comPath.length) {
        const { data } = await supabase.storage.from('anexos').createSignedUrls(comPath.map((c) => c.path), 3600);
        data?.forEach((r, i) => { if (r.signedUrl && !r.error) mapa[comPath[i].id] = r.signedUrl; });
      }
      return mapa;
    },
  });
}
