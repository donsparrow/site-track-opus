import { useEffect, useState } from 'react';
import { resolveAnexoUrl } from '@/lib/anexoUrl';

/** Resolve uma lista de paths do bucket privado em URLs assinadas. */
export function useSignedUrls(paths: (string | null | undefined)[]) {
  const key = paths.filter(Boolean).join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const run = async () => {
      const entries = await Promise.all(
        paths.filter(Boolean).map(async (p) => [p as string, (await resolveAnexoUrl(p)) || ''] as const),
      );
      if (active) setUrls(Object.fromEntries(entries));
    };
    run();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
