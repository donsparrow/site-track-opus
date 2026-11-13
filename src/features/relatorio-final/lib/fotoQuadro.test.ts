import { describe, expect, it } from 'vitest';
import {
  GRADE_GAP_COLUNAS,
  GRADE_LEGENDA_ALTURA,
  celulaDaGrade,
  encaixarFoto,
  geometriaFoto,
  layoutGradeFotos,
  legendaEmLinhas,
} from './fotoQuadro';

const CONTENT_W = 180;
const PAGE_H = 297;
const Y_INICIAL = 48;

describe('limites seguros para fotos no PDF', () => {
  it('limita fotos de 48 MP a 4000px no lado maior', () => {
    const g = geometriaFoto(8000, 6000, 180 / 95, 0, 4000);
    expect(g.outW).toBe(4000);
    expect(g.outH).toBe(2111);
    expect(g.outW * g.outH).toBeLessThanOrEqual(16_000_000);
  });
  it('foto vertical recortada horizontalmente usa apenas a região original, sem ampliação', () => {
    const g = geometriaFoto(3000, 4000, 180 / 95, 0, 4000);
    expect(g.outW).toBe(3000);
    expect(g.outH).toBe(1583);
    expect(g.drawW).toBeLessThanOrEqual(3000);
    expect(g.drawH).toBeLessThanOrEqual(4000);
  });
  it('foto pequena não é ampliada', () => {
    const g = geometriaFoto(800, 1200, 180 / 95, 0, 4000);
    expect(g.outW).toBe(800);
    expect(g.outH).toBe(422);
  });
  it('aplica limite após rotação, preservando proporção original', () => {
    const g = geometriaFoto(8000, 6000, 3 / 4, 90, 4000);
    expect(g.outW).toBe(3000); expect(g.outH).toBe(4000);
    expect(g.drawW / g.drawH).toBeCloseTo(4 / 3);
  });
  it('mesmo com limite maior nunca excede 16 milhões de pixels', () => {
    const g = geometriaFoto(10000, 10000, 4 / 3, 0, 10000);
    expect(g.outW * g.outH).toBeLessThanOrEqual(16_000_000);
    expect(g.outW / g.outH).toBeCloseTo(4 / 3, 3);
    expect(g.outW).toBeLessThan(10000);
  });
  it('quadro quadrado de 4000px respeita exatamente o orçamento Safari', () => {
    const g = geometriaFoto(10000, 10000, 1, 0, 4000);
    expect(g.outW * g.outH).toBe(16_000_000);
  });
});

describe('layoutGradeFotos', () => {
  it('usa 1 coluna para 2 fotos e 2 colunas para 4, 6 e 8', () => {
    expect(layoutGradeFotos(2, CONTENT_W, PAGE_H, Y_INICIAL)).toMatchObject({ colunas: 1, linhas: 2 });
    expect(layoutGradeFotos(4, CONTENT_W, PAGE_H, Y_INICIAL)).toMatchObject({ colunas: 2, linhas: 2 });
    expect(layoutGradeFotos(6, CONTENT_W, PAGE_H, Y_INICIAL)).toMatchObject({ colunas: 2, linhas: 3 });
    expect(layoutGradeFotos(8, CONTENT_W, PAGE_H, Y_INICIAL)).toMatchObject({ colunas: 2, linhas: 4 });
  });

  it('largura da célula desconta o intervalo de 6 mm entre colunas', () => {
    expect(layoutGradeFotos(2, CONTENT_W, PAGE_H, Y_INICIAL)!.celulaLargura).toBeCloseTo(180);
    expect(layoutGradeFotos(4, CONTENT_W, PAGE_H, Y_INICIAL)!.celulaLargura).toBeCloseTo(87);
    expect(layoutGradeFotos(8, CONTENT_W, PAGE_H, Y_INICIAL)!.celulaLargura).toBeCloseTo(87);
  });

  it('altura da célula divide o espaço útil pelas linhas, sem depender do total de fotos', () => {
    const alturaUtil = (PAGE_H - 20) - Y_INICIAL;
    expect(layoutGradeFotos(2, CONTENT_W, PAGE_H, Y_INICIAL)!.celulaAltura).toBeCloseTo(alturaUtil / 2);
    expect(layoutGradeFotos(4, CONTENT_W, PAGE_H, Y_INICIAL)!.celulaAltura).toBeCloseTo(alturaUtil / 2);
    expect(layoutGradeFotos(6, CONTENT_W, PAGE_H, Y_INICIAL)!.celulaAltura).toBeCloseTo(alturaUtil / 3);
    expect(layoutGradeFotos(8, CONTENT_W, PAGE_H, Y_INICIAL)!.celulaAltura).toBeCloseTo(alturaUtil / 4);
  });

  it('reserva 12 mm da célula para a legenda', () => {
    const g = layoutGradeFotos(6, CONTENT_W, PAGE_H, Y_INICIAL)!;
    expect(g.celulaAltura - g.areaFotoAltura).toBeCloseTo(GRADE_LEGENDA_ALTURA);
  });

  it('legenda em fonte 9 para 2 e 4 fotos e 8 para 6 e 8', () => {
    expect(layoutGradeFotos(2, CONTENT_W, PAGE_H, Y_INICIAL)!.fonteLegenda).toBe(9);
    expect(layoutGradeFotos(4, CONTENT_W, PAGE_H, Y_INICIAL)!.fonteLegenda).toBe(9);
    expect(layoutGradeFotos(6, CONTENT_W, PAGE_H, Y_INICIAL)!.fonteLegenda).toBe(8);
    expect(layoutGradeFotos(8, CONTENT_W, PAGE_H, Y_INICIAL)!.fonteLegenda).toBe(8);
  });

  it('sem grade para NULL (layout antigo) e para valores fora de 2, 4, 6 e 8', () => {
    expect(layoutGradeFotos(null, CONTENT_W, PAGE_H, Y_INICIAL)).toBeNull();
    expect(layoutGradeFotos(undefined, CONTENT_W, PAGE_H, Y_INICIAL)).toBeNull();
    expect(layoutGradeFotos(3, CONTENT_W, PAGE_H, Y_INICIAL)).toBeNull();
    expect(layoutGradeFotos(1, CONTENT_W, PAGE_H, Y_INICIAL)).toBeNull();
  });
});

describe('celulaDaGrade', () => {
  it('espalha as células por coluna e linha a partir do topo da página', () => {
    const g = layoutGradeFotos(6, CONTENT_W, PAGE_H, Y_INICIAL)!;
    const c0 = celulaDaGrade(g, 0, 15, Y_INICIAL);
    const c1 = celulaDaGrade(g, 1, 15, Y_INICIAL);
    const c2 = celulaDaGrade(g, 2, 15, Y_INICIAL);
    expect(c0).toMatchObject({ x: 15, y: Y_INICIAL, largura: g.celulaLargura, altura: g.celulaAltura });
    expect(c1.x).toBeCloseTo(15 + g.celulaLargura + GRADE_GAP_COLUNAS);
    expect(c1.y).toBeCloseTo(Y_INICIAL);
    expect(c2.x).toBeCloseTo(15);
    expect(c2.y).toBeCloseTo(Y_INICIAL + g.celulaAltura);
  });

  it('mantém a grade dentro do limite inferior da página em todas as células', () => {
    for (const n of [2, 4, 6, 8]) {
      const g = layoutGradeFotos(n, CONTENT_W, PAGE_H, Y_INICIAL)!;
      const ultima = celulaDaGrade(g, g.fotosPorPagina - 1, 15, Y_INICIAL);
      expect(ultima.y + ultima.altura).toBeLessThanOrEqual(PAGE_H - 20 + 0.001);
      expect(ultima.x + ultima.largura).toBeLessThanOrEqual(15 + CONTENT_W + 0.001);
    }
  });

  it('com uma coluna não deixa intervalo lateral sobrando', () => {
    const g = layoutGradeFotos(2, CONTENT_W, PAGE_H, Y_INICIAL)!;
    const c = celulaDaGrade(g, 1, 15, Y_INICIAL);
    expect(c.x).toBeCloseTo(15);
    expect(c.largura).toBeCloseTo(CONTENT_W);
  });
});

describe('encaixarFoto', () => {
  const area = { largura: 87, altura: 100 };

  it('foto 4:3 encaixa inteira tocando a largura da área', () => {
    const e = encaixarFoto(4000, 3000, area.largura, area.altura, 0)!;
    expect(e.largura).toBeCloseTo(87);
    expect(e.altura).toBeCloseTo(65.25);
    expect(e.largura / e.altura).toBeCloseTo(4 / 3);
  });

  it('foto vertical 3:4 encaixa inteira tocando a altura da área', () => {
    const e = encaixarFoto(3000, 4000, area.largura, area.altura, 0)!;
    expect(e.altura).toBeCloseTo(100);
    expect(e.largura).toBeCloseTo(75);
    expect(e.largura / e.altura).toBeCloseTo(3 / 4);
  });

  it('rotação de 90° troca largura e altura da foto', () => {
    const e = encaixarFoto(4000, 3000, area.largura, area.altura, 90)!;
    expect(e.altura).toBeCloseTo(100);
    expect(e.largura).toBeCloseTo(75);
    expect(e.largura / e.altura).toBeCloseTo(3 / 4);
  });

  it('rotação de 270° equivale à de 90° e 180° mantém a orientação', () => {
    const e270 = encaixarFoto(4000, 3000, area.largura, area.altura, 270)!;
    const e90 = encaixarFoto(4000, 3000, area.largura, area.altura, 90)!;
    expect(e270).toEqual(e90);
    const e180 = encaixarFoto(4000, 3000, area.largura, area.altura, 180)!;
    expect(e180.largura).toBeCloseTo(87);
  });

  it('nunca ultrapassa a área em nenhuma orientação', () => {
    for (const rotacao of [0, 90, 180, 270]) {
      for (const [w, h] of [[4000, 3000], [3000, 4000], [1000, 1000]]) {
        const e = encaixarFoto(w, h, area.largura, area.altura, rotacao)!;
        expect(e.largura).toBeLessThanOrEqual(area.largura + 0.001);
        expect(e.altura).toBeLessThanOrEqual(area.altura + 0.001);
      }
    }
  });

  it('retorna null para medidas inválidas', () => {
    expect(encaixarFoto(0, 3000, area.largura, area.altura, 0)).toBeNull();
    expect(encaixarFoto(4000, 3000, 0, area.altura, 0)).toBeNull();
  });
});

describe('legendaEmLinhas', () => {
  const medir = (t: string) => t.length * 2;
  const largura = 40;

  it('mantém a legenda em uma linha quando cabe', () => {
    expect(legendaEmLinhas('Foto 01 — sala', medir, largura)).toEqual(['Foto 01 — sala']);
  });

  it('quebra em duas linhas quando o texto passa de uma', () => {
    expect(legendaEmLinhas('aa bb cc dd ee ff gg hh', medir, largura, 2)).toEqual(['aa bb cc dd ee ff gg', 'hh']);
  });

  it('limita a duas linhas e corta com reticências', () => {
    const linhas = legendaEmLinhas('aa bb cc dd ee ff', medir, largura, 2);
    expect(linhas).toHaveLength(2);
    expect(legendaEmLinhas('aa bb cc dd ee ff gg hh ii jj', medir, largura, 2)[1].endsWith('…')).toBe(true);
  });

  it('não devolve linhas vazias para texto vazio', () => {
    expect(legendaEmLinhas('   ', medir, largura)).toEqual([]);
  });
});
