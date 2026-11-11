import { afterEach, describe, expect, it, vi } from 'vitest';
import type jsPDF from 'jspdf';
vi.mock('@/lib/pdfShared', () => ({ BLUE: [30,58,95], MARGIN:15, loadImageAsDataUrl:vi.fn(), setupPDFHelpers:vi.fn() }));
vi.mock('@/lib/pdfDownload', () => ({ downloadPdf:vi.fn() }));
vi.mock('@/lib/anexoUrl', () => ({ resolveAnexoUrl:vi.fn() }));
vi.mock('@/lib/pdfRichText', () => ({ renderRichText:vi.fn() }));
import { inserirFotoQuadro, prepararFotoQuadro } from './pdfRelatorioFinal';

function imagem(w = 3000, h = 4000) {
  vi.stubGlobal('Image', class {
    naturalWidth = w; naturalHeight = h; onload?: () => void;
    set src(_v: string) { queueMicrotask(() => this.onload?.()); }
  });
}
const documento = () => {
  const mock = { addImage:vi.fn(), setDrawColor:vi.fn(), rect:vi.fn(), setFont:vi.fn(), setFontSize:vi.fn(), setTextColor:vi.fn(), text:vi.fn() };
  return { mock, doc:mock as unknown as jsPDF };
};
afterEach(() => vi.unstubAllGlobals());
describe('fotos nunca omitidas em silêncio', () => {
  it('preparação usa JPEG 0.92, lado máximo 4000 e libera canvas', async () => {
    imagem(8000,6000);
    const ctx = { translate:vi.fn(), rotate:vi.fn(), drawImage:vi.fn(), canvas:{} };
    const exportar = vi.fn(() => 'data:image/jpeg;base64,resultado');
    const canvas = { width:0, height:0, getContext:() => ctx, toDataURL:exportar };
    ctx.canvas = canvas;
    let pixels = 0; exportar.mockImplementation(() => { expect(canvas.width).toBe(4000); pixels = canvas.width * canvas.height; return 'data:image/jpeg;base64,resultado'; });
    vi.stubGlobal('document',{createElement:() => canvas});
    await prepararFotoQuadro('original',180,95);
    expect(exportar).toHaveBeenCalledWith('image/jpeg',0.92);
    expect(pixels).toBeLessThanOrEqual(16_000_000);
    expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  });
  it('erro do canvas usa original contain centralizado e conta uma falha', async () => {
    imagem(); vi.stubGlobal('document',{createElement:() => ({getContext:() => null})});
    const {mock,doc} = documento();
    expect(await inserirFotoQuadro(doc,'original',15,50,180,95,0)).toBe(true);
    const args = mock.addImage.mock.calls[0];
    expect(args[0]).toBe('original');
    expect(args[1]).toBeCloseTo(69.375); expect(args[2]).toBe(50);
    expect(args[3]).toBeCloseTo(71.25); expect(args[4]).toBe(95);
    expect(mock.rect).not.toHaveBeenCalled();
  });
  it('falha também no original mantém quadro e conta falha', async () => {
    imagem(); vi.stubGlobal('document',{createElement:() => ({getContext:() => null})});
    const {mock,doc} = documento(); mock.addImage.mockImplementation(() => { throw new Error('imagem corrompida'); });
    expect(await inserirFotoQuadro(doc,'corrompida',15,50,180,95,0)).toBe(true);
    expect(mock.rect).toHaveBeenCalledWith(15,50,180,95);
    expect(mock.text).toHaveBeenCalled();
  });
  it('arquivo ausente permanece representado e contado', async () => {
    const {mock,doc} = documento();
    expect(await inserirFotoQuadro(doc,null,15,50,93.75,125,0)).toBe(true);
    expect(mock.rect).toHaveBeenCalledWith(15,50,93.75,125);
    expect(mock.addImage).not.toHaveBeenCalled();
  });
});