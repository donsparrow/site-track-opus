import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Eye, FileText, Image, Download } from 'lucide-react';
import { resolveAnexoUrl } from '@/lib/anexoUrl';
import type { Arquivo, Pasta } from '../types';

interface HoverArquivo extends Arquivo {
  url_arquivo: string;
}

interface Props {
  pastaAtual: Pasta | undefined;
  pastaAberta: string | null;
  arquivos: Arquivo[];
  canManage: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onExcluirArquivo: (arquivo: Arquivo) => void;
  onPreview: (url: string, tipo: string) => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ArquivosPanel({
  pastaAtual,
  pastaAberta,
  arquivos,
  canManage,
  uploading,
  onUpload,
  onExcluirArquivo,
  onPreview,
}: Props) {
  const [hoverArquivo, setHoverArquivo] = useState<HoverArquivo | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfPreviewCache = useRef<Record<string, string>>({});
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
  }, []);

  const renderPdfPreview = async (url: string, id: string) => {
    if (pdfPreviewCache.current[id]) {
      setPdfPreviewUrl(pdfPreviewCache.current[id]);
      return;
    }
    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      pdfPreviewCache.current[id] = dataUrl;
      setPdfPreviewUrl(dataUrl);
    } catch {
      setPdfPreviewUrl(null);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    onUpload(files);
    e.target.value = '';
  };

  const handleDownload = async (arq: Arquivo) => {
    const signed = await resolveAnexoUrl(arq.url_arquivo);
    if (!signed) { toast.error('Arquivo indisponível'); return; }
    const link = document.createElement('a');
    link.href = signed;
    link.download = arq.nome_arquivo;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = async (arq: Arquivo) => {
    const signed = await resolveAnexoUrl(arq.url_arquivo);
    if (!signed) { toast.error('Arquivo indisponível'); return; }
    onPreview(signed, arq.tipo);
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          {pastaAtual ? `📁 ${pastaAtual.nome_pasta}` : 'Arquivos'}
        </CardTitle>
        {canManage && pastaAberta && (
          <div className="relative">
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileInput}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Button size="sm" variant="outline" disabled={uploading}>
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? 'Enviando...' : 'Anexar'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!pastaAberta && (
          <p className="text-sm text-muted-foreground text-center py-8">Selecione uma pasta para ver os arquivos.</p>
        )}
        {pastaAberta && arquivos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum arquivo nesta pasta.</p>
        )}
        {pastaAberta && arquivos.length > 0 && (
          <div className="space-y-2">
            {arquivos.map((arq) => (
              <div
                key={arq.id}
                className="relative flex items-center justify-between rounded-lg border px-4 py-3"
                onMouseEnter={async (e) => {
                  setHoverArquivo(arq);
                  setHoverPos({ x: e.clientX, y: e.clientY });
                  setPdfPreviewUrl(null);
                  const signed = await resolveAnexoUrl(arq.url_arquivo);
                  if (!signed) return;
                  setHoverArquivo({ ...arq, url_arquivo: signed });
                  if (arq.tipo === 'pdf') {
                    hoverTimeoutRef.current = setTimeout(() => renderPdfPreview(signed, arq.id), 200);
                  }
                }}
                onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => {
                  setHoverArquivo(null);
                  setPdfPreviewUrl(null);
                  if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {arq.tipo === 'imagem' ? (
                    <Image className="h-5 w-5 shrink-0 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{arq.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(arq.tamanho)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePreview(arq)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(arq)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onExcluirArquivo(arq)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {hoverArquivo && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: Math.min(hoverPos.x + 16, window.innerWidth - 320),
            top: Math.max(hoverPos.y - 200, 8),
          }}
        >
          {hoverArquivo.tipo === 'imagem' ? (
            <img
              src={hoverArquivo.url_arquivo}
              alt={hoverArquivo.nome_arquivo}
              className="w-72 max-h-56 object-contain rounded-lg border-2 bg-background shadow-xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : pdfPreviewUrl ? (
            <img
              src={pdfPreviewUrl}
              alt={hoverArquivo.nome_arquivo}
              className="w-72 max-h-64 object-contain rounded-lg border-2 bg-background shadow-xl"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border-2 bg-background shadow-xl px-6 py-4">
              <FileText className="h-10 w-10 text-destructive" />
              <span className="text-xs text-muted-foreground">Carregando preview...</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
