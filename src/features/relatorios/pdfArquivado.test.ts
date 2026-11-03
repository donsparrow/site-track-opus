import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), storage: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, storage: { from: mocks.storage } } }));
vi.mock('@/lib/relatorioDados', () => ({ carregarDadosRelatorio: vi.fn() }));
vi.mock('./indicadores', () => ({ aplicarIndicadoresCongelados: vi.fn() }));
vi.mock('./pdf', () => ({ gerarPDFRelatorio: vi.fn() }));

import { baixarPdfAssinadoOuArquivar, calcularStatusLiberacao, statusLiberacaoLote } from './pdfArquivado';

describe('liberação de assinaturas do cliente', () => {
  beforeEach(() => vi.clearAllMocks());

  it('duas assinaturas e PDF com uma assinatura aguardam liberação', () => {
    expect(calcularStatusLiberacao(2, { qtd_assinaturas: 1 })).toEqual({ pendente: true, qtdAtual: 2, qtdVigente: 1 });
  });
  it('PDF liberado com as duas assinaturas não fica pendente', () => {
    expect(calcularStatusLiberacao(2, { qtd_assinaturas: 2 }).pendente).toBe(false);
  });
  it('sem PDF vigente não marca pendência', () => {
    expect(calcularStatusLiberacao(2, null).pendente).toBe(false);
  });
  it('consulta lote com duas queries e usa apenas o PDF vigente mais recente', async () => {
    mocks.from.mockImplementation((table: string) => {
      const result = table === 'assinaturas'
        ? { data: [{ relatorio_id: 'r1' }, { relatorio_id: 'r1' }, { relatorio_id: 'r2' }], error: null }
        : { data: [{ relatorio_id: 'r1', qtd_assinaturas: 2 }, { relatorio_id: 'r1', qtd_assinaturas: 1 }], error: null };
      const query = { select: vi.fn(), in: vi.fn(), is: vi.fn(), order: vi.fn(), then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve) };
      query.select.mockReturnValue(query); query.in.mockReturnValue(query); query.is.mockReturnValue(query); query.order.mockReturnValue(query);
      return query;
    });
    const result = await statusLiberacaoLote(['r1', 'r2', 'r1']);
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(result.r1).toEqual({ pendente: false, qtdAtual: 2, qtdVigente: 2 });
    expect(result.r2.pendente).toBe(false);
  });
  it('cliente com falha de download nunca gera nem arquiva PDF novo', async () => {
    const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { storage_path: 'vigente.pdf' }, error: null }) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.is.mockReturnValue(query); query.order.mockReturnValue(query); query.limit.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    mocks.storage.mockReturnValue({ download: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }) });
    await expect(baixarPdfAssinadoOuArquivar({ relatorioId: 'r1', empresa: null, nomeObra: 'Leal Reis', isCliente: true })).rejects.toThrow('Não foi possível baixar o PDF liberado');
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.storage).toHaveBeenCalledTimes(1);
  });
});