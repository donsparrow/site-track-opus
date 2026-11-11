export function quadroFoto(orientacao: string | null | undefined, contentW: number) {
  return orientacao === 'vertical' ? { largura: 125 * 3 / 4, altura: 125 } : { largura: contentW, altura: 95 };
}
export const proximaRotacao = (rotacao: number = 0) => (rotacao + 90) % 360;
export function geometriaFoto(w: number, h: number, ratio: number, rotacao: number, limite?: number, contain = false) {
  const troca = rotacao % 180 !== 0;
  const rw = troca ? h : w; const rh = troca ? w : h;
  const escala = contain ? Math.min(ratio / rw, 1 / rh) : Math.max(ratio / rw, 1 / rh);
  // Limited canvases never upscale the source crop or exceed Safari's pixel budget.
  const cropW = contain ? rw : Math.min(rw, rh * ratio);
  const cropH = contain ? rh : Math.min(rh, rw / ratio);
  const maior = limite !== undefined ? Math.min(limite, Math.max(cropW, cropH)) : Math.max(rw, rh);
  let outW = ratio >= 1 ? maior : maior * ratio;
  let outH = ratio >= 1 ? maior / ratio : maior;
  if (limite !== undefined && outW * outH > 16_000_000) {
    const reducao = Math.sqrt(16_000_000 / (outW * outH));
    outW *= reducao; outH *= reducao;
  }
  if (limite !== undefined) {
    outW = Math.max(1, Math.floor(outW)); outH = Math.max(1, Math.floor(outH));
  }
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
