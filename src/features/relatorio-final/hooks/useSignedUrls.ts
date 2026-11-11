import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { resolveAnexoUrl } from '@/lib/anexoUrl';
import { relatorioFinalKeys } from '../queryKeys';

/** Resolve uma lista de paths do bucket privado em URLs assinadas. */
export function useSignedUrls(paths: (string | null | undefined)[]) {
  const { user } = useAuth();
  const unique = [...new Set(paths.filter((p): p is string => !!p))].sort();
  const { data } = useQuery({
    queryKey: relatorioFinalKeys.urls(user?.id, unique), enabled: !!user && unique.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => Object.fromEntries(await Promise.all(unique.map(async p => [p, (await resolveAnexoUrl(p)) || '']))),
  });
  return data ?? {};
}
