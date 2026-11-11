import { useEffect, useRef, useState } from 'react';
import { desenharFoto } from '../lib/fotoQuadro';
export default function FotoQuadro({ src, alt, orientacao, rotacao = 0, lightbox = false }: { src?: string; alt: string; orientacao?: string; rotacao?: number; lightbox?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [erro, setErro] = useState(false);
  const [ratio, setRatio] = useState(4/3);
  useEffect(() => {
    let ativo = true; setErro(false);
    if (!src) return;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!ativo) return;
      const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
      const troca = rotacao % 180 !== 0;
      const proporcao = lightbox ? (troca ? img.naturalHeight / img.naturalWidth : img.naturalWidth / img.naturalHeight) : orientacao === 'vertical' ? 3/4 : 180/95;
      setRatio(proporcao); desenharFoto(ctx, img, proporcao, rotacao, 1200, lightbox);
    };
    img.onerror = () => { if (ativo) setErro(true); };
    img.src = src;
    return () => { ativo = false; };
  }, [src, orientacao, rotacao, lightbox]);
  return <div className={`flex w-full items-center justify-center overflow-hidden bg-muted ${lightbox ? 'h-[65vh]' : orientacao === 'vertical' ? 'aspect-[3/4]' : 'aspect-[180/95]'}`}>
    {!src || erro ? <span className="text-sm text-muted-foreground">Imagem indisponível</span> : <canvas ref={canvas} role="img" aria-label={alt} className={lightbox ? 'max-h-full max-w-full object-contain' : 'h-full w-full'} style={lightbox ? { aspectRatio: ratio, width: ratio >= 1 ? '100%' : 'auto', height: ratio < 1 ? '100%' : 'auto' } : undefined} />}
  </div>;
}
