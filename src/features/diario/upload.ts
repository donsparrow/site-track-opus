import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Faz upload ao bucket `anexos` reportando o progresso real (0-100).
 * Usa XHR porque o SDK de storage não expõe eventos de progresso.
 */
export async function uploadAnexoComProgresso(
  filePath: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token || !SUPABASE_URL) {
    // Fallback sem progresso
    const { error } = await supabase.storage.from('anexos').upload(filePath, file);
    if (error) throw error;
    onProgress?.(100);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/anexos/${filePath}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress?.(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        let msg = `Falha no upload (${xhr.status})`;
        try {
          msg = JSON.parse(xhr.responseText)?.message || msg;
        } catch {
          /* resposta não-JSON */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Falha de rede durante o upload'));
    xhr.send(file);
  });
}
