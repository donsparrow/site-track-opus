import { supabase } from '@/integrations/supabase/client';

/**
 * Extract the storage path (relative to the `anexos` bucket) from any
 * value stored in configuracoes_empresa.logo_url.
 *
 * Supports:
 * - Already-relative paths ("empresa/<id>/logo.png")
 * - Old public URLs ("https://.../storage/v1/object/public/anexos/<path>")
 * - Signed URLs ("https://.../storage/v1/object/sign/anexos/<path>?token=...")
 */
export function extractLogoPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    // Already a relative storage path.
    return trimmed.replace(/^\/+/, '');
  }

  const match = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/anexos\/([^?#]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}

/**
 * In-memory cache of signed URLs for the current session.
 * Avoids re-signing the same object repeatedly (image lists, PDF loops).
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
/** Regenerate a bit before the real expiry so links never die mid-render. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Resolve any stored logo_url value into a browser-usable URL.
 * The `anexos` bucket is private, so we generate a short-lived signed URL.
 * Returns null when the value is empty or the storage object can't be signed.
 */
export async function resolveLogoUrl(
  value: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const path = extractLogoPath(value);
  if (!path) return null;

  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from('anexos')
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    signedUrlCache.delete(path);
    return null;
  }

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
  return data.signedUrl;
}

/** Drop cached signed URLs (all, or a single stored value/path). */
export function clearSignedUrlCache(value?: string | null) {
  if (!value) { signedUrlCache.clear(); return; }
  const path = extractLogoPath(value);
  if (path) signedUrlCache.delete(path);
}
