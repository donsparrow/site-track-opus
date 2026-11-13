import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
const sb = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: sb }));
import { infoListaRelatorios, calcularEmissao, montarNomeArquivoRelatorio, sanitizarNomeObra, formatarNumero } from './nomeArquivo';

const nome = (a: Parameters<typeof calcularEmissao>[0], numero: number | null = 5) => {
  const { rev, data } = calcularEmissao(a);
  return montarNomeArquivoRelatorio({ nomeObra: 'Leal Reis', numero, rev, data });
};

describe('nome do arquivo do relatório', () => {
  it('minuta', () => expect(nome({ assinaturas: [], versoes: [], revisao: 0 })).toBe('Leal Reis - Relatorio 05 - minuta.pdf'));
  it('emitido com assinado_em', () => expect(nome({ assinaturas: [{ tipo: 'responsavel_tecnico', assinado_em: '2026-11-20T15:00:00' }], versoes: [], revisao: 0 })).toBe('Leal Reis - Relatorio 05 - 20-11-2026.pdf'));
  it('emitido só com data_assinatura sem deslocar fuso', () => expect(nome({ assinaturas: [{ tipo: 'responsavel_tecnico', data_assinatura: '2026-11-01' }], versoes: [], revisao: 0 })).toBe('Leal Reis - Relatorio 05 - 01-11-2026.pdf'));
  it('duas assinaturas do RT: vale a primeira', () => expect(nome({ assinaturas: [
    { tipo: 'responsavel_tecnico', data_assinatura: '2026-11-15' },
    { tipo: 'responsavel_tecnico', data_assinatura: '2026-11-10' },
  ], versoes: [], revisao: 0 })).toBe('Leal Reis - Relatorio 05 - 10-11-2026.pdf'));
  it('assinatura de cliente não muda nada', () => expect(nome({ assinaturas: [{ tipo: 'cliente', data_assinatura: '2026-11-10' }], versoes: [], revisao: 0 })).toBe('Leal Reis - Relatorio 05 - minuta.pdf'));
  it('REV 01 usa data da última versão', () => expect(nome({
    assinaturas: [{ tipo: 'responsavel_tecnico', data_assinatura: '2026-11-01' }],
    versoes: [{ numero_versao: 1, data_criacao: '2026-11-05T10:00:00' }, { numero_versao: 2, data_criacao: '2026-11-20T10:00:00' }],
    revisao: 0, versaoLayout: 2,
  })).toBe('Leal Reis - Relatorio 05 - REV 01 - 20-11-2026.pdf'));
  it('sanitização', () => expect(sanitizarNomeObra('Bloco A/B: Ária')).toBe('Bloco AB Aria'));
  it('número 5 → 05', () => expect(formatarNumero(5)).toBe('05'));
  it('sem número', () => expect(nome({ assinaturas: [], versoes: [], revisao: 0 }, null)).toBe('Leal Reis - Relatorio - minuta.pdf'));
});

describe('infoListaRelatorios', () => {
  const tabelas = (assinaturas: unknown[], versoes: unknown[]) => {
    sb.from.mockImplementation((t: string) => ({
      select: () => ({ in: () => Promise.resolve({ data: t === 'assinaturas' ? assinaturas : versoes, error: null }) }),
    }));
  };
  beforeEach(() => { sb.rpc.mockReset(); sb.from.mockReset(); });

  it('ordena assinaturas do cliente da mais recente para a mais antiga', async () => {
    sb.rpc.mockResolvedValue({ data: [{ relatorio_id: 'r1', numero: 3 }], error: null });
    tabelas([
      { relatorio_id: 'r1', tipo: 'cliente', data_assinatura: '2026-11-02' },
      { relatorio_id: 'r1', tipo: 'cliente', assinado_em: '2026-11-10T12:00:00' },
      { relatorio_id: 'r1', tipo: 'responsavel_tecnico', data_assinatura: '2026-11-01' },
    ], []);
    const info = await infoListaRelatorios([{ id: 'r1', revisao_pdf: 0, versao_layout: 2 }]);
    expect(info.r1.assinaturasCliente.map((d) => d.getDate())).toEqual([10, 2]);
    expect(info.r1.numero).toBe(3);
  });

  it('sem assinatura do RT → emissão null', async () => {
    sb.rpc.mockResolvedValue({ data: [], error: null });
    tabelas([{ relatorio_id: 'r1', tipo: 'cliente', data_assinatura: '2026-11-02' }], []);
    const info = await infoListaRelatorios([{ id: 'r1', revisao_pdf: 0, versao_layout: 2 }]);
    expect(info.r1.emissao).toBeNull();
  });

  it('ids vazios → {} sem consultar', async () => {
    expect(await infoListaRelatorios([])).toEqual({});
    expect(sb.rpc).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('falha na RPC de números → número null e o resto preenchido', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: new Error('falhou') });
    tabelas([{ relatorio_id: 'r1', tipo: 'responsavel_tecnico', data_assinatura: '2026-11-05' }], []);
    const info = await infoListaRelatorios([{ id: 'r1', revisao_pdf: 0, versao_layout: 2 }]);
    expect(info.r1.numero).toBeNull();
    expect(info.r1.emissao?.getDate()).toBe(5);
  });
});
