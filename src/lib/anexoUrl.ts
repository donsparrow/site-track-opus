import { extractLogoPath, resolveLogoUrl } from './logoUrl';

/**
 * Generic helpers for the private `anexos` bucket.
 * Values may be stored as relative paths (preferred) or legacy public/signed URLs.
 */
export const extractAnexoPath = extractLogoPath;
export const resolveAnexoUrl = resolveLogoUrl;

/** Resolve `assinatura_url` of each signature into a short-lived signed URL. */
export async function resolveAssinaturas<T extends { assinatura_url?: string | null }>(
  assinaturas: T[],
  expiresInSeconds = 3600,
): Promise<T[]> {
  return Promise.all(
    (assinaturas || []).map(async (a) => ({
      ...a,
      assinatura_url: (await resolveAnexoUrl(a.assinatura_url, expiresInSeconds)) || a.assinatura_url || '',
    })),
  );
}
