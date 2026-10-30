import { describe, it, expect } from 'vitest';
import {
  prazoContratualBase, datasUteisParadas, diasUteisSemDiario, calcularProgressoGlobal, calcularPrazoConsumido,
} from './prazoObra';

const orig = (p: number) => ({ peso: 100, percentual_concluido: p, tipo_atividade: 'original' });
const adit = (id: string | null, p: number) => ({ peso: 100, percentual_concluido: p, tipo_atividade: 'aditivo', aditivo_id: id });

describe('datasUteisParadas', () => {
  it('duas paralisações na mesma data contam 1 dia', () => {
    expect(datasUteisParadas([{ data_inicio: '2026-10-07' }, { data_inicio: '2026-10-07', data_fim: '2026-10-07' }], '2026-10-01', '2026-10-31').size).toBe(1);
  });
  it('sábado não conta', () => {
    expect(datasUteisParadas([{ data_inicio: '2026-10-10' }], '2026-10-01', '2026-10-31').size).toBe(0);
  });
  it('intervalo 08 a 13/10 = 4 dias úteis', () => {
    expect(datasUteisParadas([{ data_inicio: '2026-10-08', data_fim: '2026-10-13' }], '2026-10-01', '2026-10-31').size).toBe(4);
  });
  it('ignora datas fora do intervalo', () => {
    expect(datasUteisParadas([{ data_inicio: '2026-09-30' }, { data_inicio: '2026-11-02' }], '2026-10-01', '2026-10-31').size).toBe(0);
  });
});

describe('diasUteisSemDiario', () => {
  it('lista dias úteis sem diário', () => {
    expect(diasUteisSemDiario(['2026-10-05', '2026-10-06', '2026-10-08'], '2026-10-05', '2026-10-09')).toEqual(['2026-10-07', '2026-10-09']);
  });
  it('corte antes do início = vazio', () => {
    expect(diasUteisSemDiario([], '2026-10-09', '2026-10-05')).toEqual([]);
  });
});

describe('calcularProgressoGlobal', () => {
  it('contrato 80% (40d) + aditivo 30% (10d) = 70', () => {
    const r = calcularProgressoGlobal([orig(80), adit('a', 30)], [{ id: 'a', descricao: 'A', dias_adicionais: 10 }], 40);
    expect(r.global).toBe(70);
  });
  it('contrato 100% (40d), A 50% (10d), B 0% (20d) = 64 e aditivos 17', () => {
    const r = calcularProgressoGlobal([orig(100), adit('a', 50), adit('b', 0)],
      [{ id: 'a', descricao: 'A', dias_adicionais: 10 }, { id: 'b', descricao: 'B', dias_adicionais: 20 }], 40);
    expect(r.global).toBe(64);
    expect(r.aditivos).toBe(17);
  });
  it('sem aditivos: global = contrato', () => {
    expect(calcularProgressoGlobal([orig(45)], [], 40).global).toBe(45);
  });
  it('atividade de aditivo sem vínculo não altera o global', () => {
    const r = calcularProgressoGlobal([orig(80), adit(null, 0)], [], 40);
    expect(r.global).toBe(80);
    expect(r.atividadesSemVinculo).toBe(1);
  });
});

describe('calcularPrazoConsumido', () => {
  it('40 decorridos, 10 parados, prazo 50', () => {
    expect(calcularPrazoConsumido(40, 10, 50)).toEqual({ diasConsumidos: 30, percentual: 60 });
  });
});

describe('prazoContratualBase', () => {
  it('usa prazo_contratual_dias quando > 0', () => {
    expect(prazoContratualBase({ prazo_contratual_dias: 30, data_inicio: '2026-10-05', data_fim_prevista: '2026-10-09' })).toBe(30);
  });
  it('senão, dias úteis entre início e fim previsto', () => {
    expect(prazoContratualBase({ prazo_contratual_dias: 0, data_inicio: '2026-10-05', data_fim_prevista: '2026-10-16' })).toBe(10);
  });
  it('senão, 0', () => {
    expect(prazoContratualBase({})).toBe(0);
  });
});
