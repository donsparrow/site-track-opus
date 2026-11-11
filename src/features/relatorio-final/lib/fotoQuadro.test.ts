import { describe, expect, it } from 'vitest';
import { geometriaFoto } from './fotoQuadro';

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