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

/** Espaço horizontal entre colunas da grade de fotos, em mm. */
export const GRADE_GAP_COLUNAS = 6;
/** Faixa reservada no rodapé de cada célula para a legenda, em mm. */
export const GRADE_LEGENDA_ALTURA = 12;
/** Valores aceitos em relatorios_finais.fotos_por_pagina. */
export const FOTOS_POR_PAGINA_VALIDAS = [2, 4, 6, 8] as const;

export interface GradeFotos {
  fotosPorPagina: number;
  colunas: number;
  linhas: number;
  celulaLargura: number;
  celulaAltura: number;
  /** Altura disponível para a foto dentro da célula (célula menos a faixa da legenda). */
  areaFotoAltura: number;
  fonteLegenda: number;
}

/**
 * Geometria da grade de fotos de um grupo. `yInicial` é o y logo abaixo do título
 * do grupo na primeira página; a altura da célula é calculada uma única vez e
 * repetida em todas as páginas do grupo.
 * Retorna null quando o laudo não usa grade (fotos_por_pagina NULL = layout antigo).
 */
export function layoutGradeFotos(
  fotosPorPagina: number | null | undefined,
  contentW: number,
  pageH: number,
  yInicial: number,
): GradeFotos | null {
  if (!FOTOS_POR_PAGINA_VALIDAS.includes(fotosPorPagina as (typeof FOTOS_POR_PAGINA_VALIDAS)[number])) return null;
  const colunas = fotosPorPagina === 2 ? 1 : 2;
  const linhas = fotosPorPagina / colunas;
  const celulaLargura = (contentW - GRADE_GAP_COLUNAS * (colunas - 1)) / colunas;
  const alturaUtil = (pageH - 20) - yInicial;
  const celulaAltura = alturaUtil / linhas;
  return {
    fotosPorPagina,
    colunas,
    linhas,
    celulaLargura,
    celulaAltura,
    areaFotoAltura: Math.max(1, celulaAltura - GRADE_LEGENDA_ALTURA),
    fonteLegenda: fotosPorPagina <= 4 ? 9 : 8,
  };
}

/** Posição da célula de um índice dentro da página (0 = primeira célula da página). */
export function celulaDaGrade(grade: GradeFotos, indiceNaPagina: number, xEsquerda: number, yTopo: number) {
  const coluna = indiceNaPagina % grade.colunas;
  const linha = Math.floor(indiceNaPagina / grade.colunas);
  return {
    x: xEsquerda + coluna * (grade.celulaLargura + GRADE_GAP_COLUNAS),
    y: yTopo + linha * grade.celulaAltura,
    largura: grade.celulaLargura,
    altura: grade.celulaAltura,
  };
}

/**
 * Encaixa a foto inteira na área (contain, sem corte). Rotações de 90/270 trocam
 * largura e altura, pois a foto é desenhada já girada.
 */
export function encaixarFoto(w: number, h: number, areaLargura: number, areaAltura: number, rotacao = 0) {
  if (!(w > 0) || !(h > 0) || !(areaLargura > 0) || !(areaAltura > 0)) return null;
  const troca = Math.abs(rotacao % 180) === 90;
  const rw = troca ? h : w;
  const rh = troca ? w : h;
  const escala = Math.min(areaLargura / rw, areaAltura / rh);
  return { largura: rw * escala, altura: rh * escala };
}

/**
 * Quebra a legenda em no máximo `maxLinhas` linhas e corta a última com "…"
 * quando ainda sobra texto. `medir` devolve a largura real do trecho (mm).
 */
export function legendaEmLinhas(texto: string, medir: (t: string) => number, larguraMax: number, maxLinhas = 2): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  if (!palavras.length || !(larguraMax > 0) || maxLinhas < 1) return [];
  const linhas: string[] = [];
  let atual = '';
  let sobrouTexto = false;
  for (let i = 0; i < palavras.length; i += 1) {
    const teste = atual ? `${atual} ${palavras[i]}` : palavras[i];
    if (atual && medir(teste) > larguraMax) {
      if (linhas.length === maxLinhas - 1) { sobrouTexto = true; break; }
      linhas.push(atual);
      atual = palavras[i];
    } else {
      atual = teste;
    }
  }
  if (atual && !sobrouTexto) linhas.push(atual);
  if (!linhas.length) return [];
  if (sobrouTexto) {
    let corte = linhas[linhas.length - 1];
    while (corte.length > 1 && medir(`${corte}…`) > larguraMax) corte = corte.slice(0, -1).trimEnd();
    linhas[linhas.length - 1] = `${corte}…`;
  }
  return linhas;
}
