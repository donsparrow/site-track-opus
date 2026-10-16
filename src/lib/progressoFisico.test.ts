import { describe, it, expect } from 'vitest';
import { calcularProgressoEscopo } from './progressoFisico';

describe('progresso físico — regra canônica', () => {
  it('aditivos não entram no escopo original (peso total 200)', () => {
    const r = calcularProgressoEscopo([
      { peso: 50, percentual_concluido: 100, tipo_atividade: 'original' },
      { peso: 50, percentual_concluido: 0, tipo_atividade: null },
      { peso: 100, percentual_concluido: 20, tipo_atividade: 'aditivo' },
    ]);
    expect(r.original).toBe(50);
    expect(r.aditivo).toBe(20);
    expect(r.pesoOriginal).toBe(100);
  });

  it('pesos originais zerados usam média simples', () => {
    expect(calcularProgressoEscopo([
      { peso: 0, percentual_concluido: 40 },
      { peso: 0, percentual_concluido: 80 },
    ]).original).toBe(60);
  });

  it('pondera pela soma dos pesos originais mesmo fora de 100', () => {
    expect(calcularProgressoEscopo([
      { peso: 30, percentual_concluido: 100 },
      { peso: 10, percentual_concluido: 0 },
    ]).original).toBe(75);
  });

  it('nunca passa de 100%', () => {
    expect(calcularProgressoEscopo([{ peso: 10, percentual_concluido: 150 }]).original).toBe(100);
  });
});
