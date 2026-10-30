import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mocks de ambiente (node não tem document/URL.createObjectURL) ---
const eventos: string[] = [];
const anchor = { click: () => eventos.push('download'), remove: () => {}, href: '', download: '' };
(globalThis as any).document = {
  createElement: () => anchor,
  body: { appendChild: () => {} },
};
(globalThis as any).URL.createObjectURL = () => 'blob:mock';
(globalThis as any).URL.revokeObjectURL = () => {};

// --- estado controlável pelos testes ---
const estado = {
  vigente: null as null | { id: string; storage_path: string; sha256: string },
  falhaDownload: false,
  falhaUpload: false,
  falhaConsulta: false,
  inserts: 0,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      if (tabela === 'relatorios') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'r1', status: 'assinado', obra_id: 'o1', data_inicio: '2026-09-28', data_fim: '2026-10-02', revisao_pdf: 0, empresa_id: 'e1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabela === 'obras') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'o1', nome: 'Obra X' } }) }) }) };
      }
      if (tabela === 'assinaturas' || tabela === 'relatorio_versoes') {
        return { select: () => ({ eq: () => ({ order: async () => ({ data: [] }) }) }) };
      }
      if (tabela === 'relatorio_pdfs_assinados') {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => {
                      if (estado.falhaConsulta) return { data: null, error: new Error('consulta falhou') };
                      return { data: estado.vigente, error: null };
                    },
                  }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => {
                estado.inserts += 1;
                eventos.push('insert');
                return { data: { id: 'novo' }, error: null };
              },
            }),
          }),
        };
      }
      if (tabela === 'relatorio_logs') {
        return { insert: async () => ({ error: null }) };
      }
      throw new Error('tabela não mockada: ' + tabela);
    },
    storage: {
      from: () => ({
        download: async () => {
          if (estado.falhaDownload) return { data: null, error: new Error('download falhou') };
          eventos.push('download-original');
          return { data: new Blob(['pdf-original']), error: null };
        },
        upload: async () => {
          if (estado.falhaUpload) return { error: new Error('upload falhou') };
          eventos.push('upload');
          return { error: null };
        },
      }),
    },
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  },
}));

vi.mock('@/lib/relatorioDados', () => ({ carregarDadosRelatorio: async () => ({}) }));
vi.mock('./indicadores', () => ({ aplicarIndicadoresCongelados: (d: unknown) => d }));
vi.mock('./pdf', () => ({
  gerarPDFRelatorio: async () => ({ blob: new Blob(['pdf-gerado']), fileName: 'gerado.pdf' }),
}));

import { baixarPdfAssinadoOuArquivar } from './pdfArquivado';

describe('baixarPdfAssinadoOuArquivar', () => {
  beforeEach(() => {
    eventos.length = 0;
    estado.vigente = null;
    estado.falhaDownload = false;
    estado.falhaUpload = false;
    estado.falhaConsulta = false;
    estado.inserts = 0;
  });

  it('vigente + download OK → original, sem gerar nem arquivar', async () => {
    estado.vigente = { id: 'p1', storage_path: 'e1/r1/a.pdf', sha256: 'abc' };
    const r = await baixarPdfAssinadoOuArquivar({ relatorioId: 'r1', empresa: null, nomeObra: 'Obra X' });
    expect(r).toBe('original');
    expect(eventos).toEqual(['download-original', 'download']);
    expect(estado.inserts).toBe(0);
  });

  it('vigente + falha no download → gera e baixa, SEM novo arquivamento', async () => {
    estado.vigente = { id: 'p1', storage_path: 'e1/r1/a.pdf', sha256: 'abc' };
    estado.falhaDownload = true;
    const r = await baixarPdfAssinadoOuArquivar({ relatorioId: 'r1', empresa: null, nomeObra: 'Obra X' });
    expect(r).toBe('gerado_sem_arquivo');
    expect(eventos).toEqual(['download']);
    expect(estado.inserts).toBe(0);
  });

  it('sem vigente + upload OK → baixa ANTES de arquivar, registro criado', async () => {
    const r = await baixarPdfAssinadoOuArquivar({ relatorioId: 'r1', empresa: null, nomeObra: 'Obra X' });
    expect(r).toBe('arquivado_agora');
    expect(eventos).toEqual(['download', 'upload', 'insert']);
    expect(estado.inserts).toBe(1);
  });

  it('sem vigente + falha no upload → baixa mesmo assim, nenhum registro', async () => {
    estado.falhaUpload = true;
    const r = await baixarPdfAssinadoOuArquivar({ relatorioId: 'r1', empresa: null, nomeObra: 'Obra X' });
    expect(r).toBe('gerado_sem_arquivo');
    expect(eventos).toEqual(['download']);
    expect(estado.inserts).toBe(0);
  });

  it('falha na consulta do vigente → trata como sem vigente, gera e baixa', async () => {
    estado.falhaConsulta = true;
    estado.falhaUpload = true;
    const r = await baixarPdfAssinadoOuArquivar({ relatorioId: 'r1', empresa: null, nomeObra: 'Obra X' });
    expect(r).toBe('gerado_sem_arquivo');
    expect(eventos).toEqual(['download']);
  });
});
