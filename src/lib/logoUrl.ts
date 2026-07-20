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

  const { data, error } = await supabase.storage
    .from('anexos')
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
