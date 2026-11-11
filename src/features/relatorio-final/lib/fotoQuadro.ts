export function quadroFoto(orientacao: string | null | undefined, contentW: number) {
  return orientacao === 'vertical' ? { largura: 125 * 3 / 4, altura: 125 } : { largura: contentW, altura: 95 };
}
export const proximaRotacao = (rotacao: number = 0) => (rotacao + 90) % 360;
export function geometriaFoto(w: number, h: number, ratio: number, rotacao: number, limite?: number, contain = false) {
  const troca = rotacao % 180 !== 0;
  const rw = troca ? h : w; const rh = troca ? w : h;
  const escala = contain ? Math.min(ratio / rw, 1 / rh) : Math.max(ratio / rw, 1 / rh);
  // PDF: preserve original pixel density, including all source detail needed by the crop.
  const maior = limite ? Math.min(limite, Math.max(rw, rh)) : Math.max(2000, Math.max(rw, rh));
  const outW = ratio >= 1 ? maior : maior * ratio; const outH = ratio >= 1 ? maior / ratio : maior;
  const k = outH * escala;
  return { outW: Math.round(outW), outH: Math.round(outH), drawW: w * k, drawH: h * k };
}
export function desenharFoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, ratio: number, rotacao: number, limite?: number, contain = false) {
  const g = geometriaFoto(img.naturalWidth, img.naturalHeight, ratio, rotacao, limite, contain);
  ctx.canvas.width = g.outW; ctx.canvas.height = g.outH;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(g.outW / 2, g.outH / 2); ctx.rotate(rotacao * Math.PI / 180);
  ctx.drawImage(img, -g.drawW / 2, -g.drawH / 2, g.drawW, g.drawH);
  return g;
}
