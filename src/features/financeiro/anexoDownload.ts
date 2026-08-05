import { toast } from 'sonner';
import { resolveAnexoUrl } from '@/lib/anexoUrl';

/** Baixa um anexo do bucket privado via signed URL, com fallback mobile. */
export async function downloadAnexo(url: string, nome?: string) {
  try {
    const signed = await resolveAnexoUrl(url);
    if (!signed) { toast.error('Arquivo não encontrado no armazenamento.'); return; }

    const res = await fetch(signed);
    if (!res.ok) throw new Error('Falha ao baixar arquivo');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.rel = 'noopener';
    if (isIOS) {
      a.target = '_blank';
    } else {
      a.download = nome || 'anexo';
      if (isAndroid) a.target = '_blank';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), isIOS || isAndroid ? 60000 : 10000);
  } catch (err) {
    toast.error('Erro ao baixar arquivo: ' + (err instanceof Error ? err.message : 'desconhecido'));
  }
}
