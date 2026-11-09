import { describe, expect, it } from 'vitest';
import { dataNoDiaUtil, situacaoParcela } from './utils';

describe('painel do cliente', () => {
  it('previsão: 5º dia útil a partir de segunda 09/11/2026 é sexta 13/11', () => {
    expect(dataNoDiaUtil('2026-11-09', 5)).toBe('2026-11-13');
  });
  it('previsão pula fim de semana: 6º dia útil é segunda 16/11', () => {
    expect(dataNoDiaUtil('2026-11-09', 6)).toBe('2026-11-16');
  });
  it('parcela com recebimento é paga', () => {
    expect(situacaoParcela({ data_recebimento: '2026-10-01', data_vencimento: '2026-09-01' }, '2026-11-09')).toBe('pago');
  });
  it('parcela sem recebimento e vencida antes de hoje é vencida', () => {
    expect(situacaoParcela({ data_recebimento: null, data_vencimento: '2026-11-08' }, '2026-11-09')).toBe('vencida');
  });
  it('parcela que vence hoje está a vencer', () => {
    expect(situacaoParcela({ data_recebimento: null, data_vencimento: '2026-11-09' }, '2026-11-09')).toBe('a_vencer');
  });
});
