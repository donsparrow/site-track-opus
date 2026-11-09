import { describe, expect, it } from 'vitest';
import { gerarParcelas, maximoParcela, saldoNaoParcelado, somaValores, vencimentoSugerido } from './parcelasCalc';

describe('parcelas de receita', () => {
  it('R$ 100.000 em 3x gera 33.333,33 / 33.333,33 / 33.333,34', () => {
    const p = gerarParcelas(100000, 3, '2026-11-09');
    expect(p.map((x) => x.valor)).toEqual([33333.33, 33333.33, 33333.34]);
    expect(somaValores(p.map((x) => x.valor))).toBe(100000);
  });

  it('vencimentos em hoje+30, +60, +90', () => {
    const p = gerarParcelas(300, 3, '2026-11-09');
    expect(p.map((x) => x.data_vencimento)).toEqual(['2026-12-09', '2027-01-08', '2027-02-07']);
  });

  it('saldo após editar parcela de 10.000 para 8.000 é 2.000', () => {
    expect(saldoNaoParcelado(30000, [8000, 10000, 10000])).toBe(2000);
  });

  it('máximo da parcela é total menos as demais', () => {
    expect(maximoParcela(30000, 20000)).toBe(10000);
  });

  it('vencimento sugerido é 30 dias após a última parcela', () => {
    expect(vencimentoSugerido(['2026-12-09', '2027-02-07', '2027-01-08'])).toBe('2027-03-09');
  });
});
