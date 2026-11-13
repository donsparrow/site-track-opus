import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { calcularEmissao, montarNomeArquivoRelatorio, sanitizarNomeObra, formatarNumero } from './nomeArquivo';

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
