import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, Loader2, FileText } from 'lucide-react';
import { resolveAnexoUrl } from '@/lib/anexoUrl';

export interface AnexoPreviewTarget {
  url: string;
  nome?: string;
  tipo?: string;
}

interface Props {
  anexo: AnexoPreviewTarget | null;
  onOpenChange: (open: boolean) => void;
  onDownload?: (url: string, nome?: string) => void;
}

const getKind = (name: string): 'pdf' | 'image' | 'other' => {
  const ext = (name.split('?')[0].split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
  return 'other';
};

export default function AnexoPreviewDialog({ anexo, onOpenChange, onDownload }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let cancel = false;
    if (!anexo) { setSignedUrl(null); setError(null); setZoom(false); return; }
    setLoading(true);
    setError(null);
    resolveAnexoUrl(anexo.url)
      .then((url) => {
        if (cancel) return;
        if (!url) setError('Arquivo não encontrado no armazenamento.');
        else setSignedUrl(url);
      })
      .catch((e: any) => { if (!cancel) setError(e?.message || 'Erro ao carregar arquivo.'); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [anexo]);

  const kind = getKind(anexo?.nome || anexo?.url || '');

  return (
    <Dialog open={!!anexo} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] h-[92vh] flex flex-col p-4 gap-3">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{anexo?.nome || 'Documento'}</span>
            {anexo?.tipo && (
              <Badge variant="outline" className="shrink-0">
                {anexo.tipo === 'nota_fiscal' ? 'Nota Fiscal' : anexo.tipo === 'boleto' ? 'Boleto' : anexo.tipo}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => anexo && onDownload?.(anexo.url, anexo.nome)}>
            <Download className="h-4 w-4 mr-1" /> Baixar
          </Button>
          <Button size="sm" variant="outline" disabled={!signedUrl} onClick={() => signedUrl && window.open(signedUrl, '_blank', 'noopener')}>
            <ExternalLink className="h-4 w-4 mr-1" /> Abrir em nova aba
          </Button>
        </div>

        <div className="flex-1 min-h-0 rounded-md border bg-muted/30 overflow-auto">
          {loading && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          )}
          {!loading && error && (
            <div className="h-full flex items-center justify-center text-center text-sm text-destructive p-4">{error}</div>
          )}
          {!loading && !error && signedUrl && kind === 'pdf' && (
            <iframe src={signedUrl} title={anexo?.nome || 'PDF'} className="w-full h-full border-0" />
          )}
          {!loading && !error && signedUrl && kind === 'image' && (
            <div className="h-full w-full flex items-center justify-center p-2">
              <img
                src={signedUrl}
                alt={anexo?.nome || 'Anexo'}
                onClick={() => setZoom((z) => !z)}
                className={zoom ? 'cursor-zoom-out max-w-none' : 'cursor-zoom-in max-h-full max-w-full object-contain'}
              />
            </div>
          )}
          {!loading && !error && signedUrl && kind === 'other' && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-4">
              <p className="text-sm text-muted-foreground">Pré-visualização não disponível para este formato.</p>
              <Button size="sm" onClick={() => anexo && onDownload?.(anexo.url, anexo.nome)}>
                <Download className="h-4 w-4 mr-1" /> Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
