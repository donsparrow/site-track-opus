import { useEffect, useRef, useState } from 'react';
import { desenharFoto } from '../lib/fotoQuadro';

/**
 * Quadro de foto do laudo.
 *
 * `modo="inteira"` desenha a foto completa (contain), centralizada, com o
 * `bg-muted` aparecendo nas sobras — o recorte do layout antigo só acontece
 * quando o laudo não usa grade de fotos por página.
 * `quadro` permite outra moldura (mesma unidade nos dois lados), usada pela
 * prévia A4, onde a célula tem proporção diferente da miniatura.
 */
export default function FotoQuadro({
  src,
  alt,
  orientacao,
  rotacao = 0,
  lightbox = false,
  modo,
  quadro,
}: {
  src?: string;
  alt: string;
  orientacao?: string;
  rotacao?: number;
  lightbox?: boolean;
  modo?: 'inteira';
  quadro?: { largura: number; altura: number };
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [erro, setErro] = useState(false);
  const [ratio, setRatio] = useState(4 / 3);
  const inteira = modo === 'inteira';
  const larguraQuadro = quadro?.largura;
  const alturaQuadro = quadro?.altura;
  useEffect(() => {
    let ativo = true; setErro(false);
    if (!src) return;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!ativo) return;
      const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
      const troca = rotacao % 180 !== 0;
      const proporcao = lightbox
        ? (troca ? img.naturalHeight / img.naturalWidth : img.naturalWidth / img.naturalHeight)
        : inteira && larguraQuadro && alturaQuadro
          ? larguraQuadro / alturaQuadro
          : orientacao === 'vertical' ? 3 / 4 : 180 / 95;
      setRatio(proporcao); desenharFoto(ctx, img, proporcao, rotacao, 1200, lightbox || inteira);
    };
    img.onerror = () => { if (ativo) setErro(true); };
    img.src = src;
    return () => { ativo = false; };
  }, [src, orientacao, rotacao, lightbox, inteira, larguraQuadro, alturaQuadro]);
  const moldura = inteira && larguraQuadro && alturaQuadro ? { aspectRatio: `${larguraQuadro} / ${alturaQuadro}` } : undefined;
  const classe = lightbox ? 'h-[65vh]' : inteira && larguraQuadro && alturaQuadro ? '' : orientacao === 'vertical' ? 'aspect-[3/4]' : 'aspect-[180/95]';
  return <div className={`flex w-full items-center justify-center overflow-hidden bg-muted ${classe}`} style={moldura}>
    {!src || erro ? <span className="text-sm text-muted-foreground">Imagem indisponível</span> : <canvas ref={canvas} role="img" aria-label={alt} className={lightbox ? 'max-h-full max-w-full object-contain' : 'h-full w-full'} style={lightbox ? { aspectRatio: ratio, width: ratio >= 1 ? '100%' : 'auto', height: ratio < 1 ? '100%' : 'auto' } : undefined} />}
  </div>;
}
