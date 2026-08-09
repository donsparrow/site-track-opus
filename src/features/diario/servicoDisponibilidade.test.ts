import { describe, it, expect } from 'vitest';
import { classificarServicos, percentualSeguro } from './servicoDisponibilidade';
import type { CronogramaAtividadeOption } from './types';

const ativ = (id: string, percentual_concluido: unknown, nome = `Serviço ${id}`): CronogramaAtividadeOption =>
  ({ id, nome_atividade: nome, percentual_concluido, peso: 0 } as unknown as CronogramaAtividadeOption);

describe('percentualSeguro', () => {
  it('trata nulo, undefined e não numérico como 0', () => {
    expect(percentualSeguro(null)).toBe(0);
    expect(percentualSeguro(undefined)).toBe(0);
    expect(percentualSeguro('abc')).toBe(0);
    expect(percentualSeguro(NaN)).toBe(0);
    expect(percentualSeguro('')).toBe(0);
    expect(percentualSeguro('45')).toBe(45);
    expect(percentualSeguro(120)).toBe(100);
  });
});

describe('classificarServicos', () => {
  it('marca serviço em andamento como disponível', () => {
    const r = classificarServicos({ atividades: [ativ('a', 40)], lancadasIds: [] });
    expect(r.itens[0].estado).toBe('disponivel');
    expect(r.itens[0].habilitado).toBe(true);
    expect(r.itens[0].badge).toBeNull();
    expect(r.totalDisponiveis).toBe(1);
    expect(r.total).toBe(1);
  });

  it('marca serviço 100% como concluído, desabilitado e com badge', () => {
    const r = classificarServicos({ atividades: [ativ('a', 100)], lancadasIds: [] });
    expect(r.itens[0].estado).toBe('concluido');
    expect(r.itens[0].habilitado).toBe(false);
    expect(r.itens[0].badge).toBe('100% concluído');
  });

  it('marca serviço já lançado no diário como indisponível', () => {
    const r = classificarServicos({ atividades: [ativ('a', 30)], lancadasIds: ['a'] });
    expect(r.itens[0].estado).toBe('ja_lancado');
    expect(r.itens[0].habilitado).toBe(false);
    expect(r.itens[0].badge).toBe('Já lançado neste diário');
  });

  it('mantém o selecionadoId selecionável em edição, mesmo 100% e já lançado, exibindo o badge', () => {
    const r = classificarServicos({
      atividades: [ativ('a', 100)],
      lancadasIds: ['a'],
      selecionadoId: 'a',
    });
    expect(r.itens[0].habilitado).toBe(true);
    expect(r.itens[0].badge).toBe('100% concluído');
  });

  it('trata percentual nulo como 0 (disponível)', () => {
    const r = classificarServicos({ atividades: [ativ('a', null)], lancadasIds: [] });
    expect(r.itens[0].estado).toBe('disponivel');
    expect(r.itens[0].habilitado).toBe(true);
  });

  it('ordena disponíveis primeiro preservando a ordem original', () => {
    const r = classificarServicos({
      atividades: [ativ('a', 100), ativ('b', 10), ativ('c', 50), ativ('d', 20)],
      lancadasIds: ['d'],
    });
    expect(r.itens.map((i) => i.atividade.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(r.totalDisponiveis).toBe(2);
  });

  it('sinaliza quando todos os serviços estão indisponíveis', () => {
    const r = classificarServicos({
      atividades: [ativ('a', 100), ativ('b', 60)],
      lancadasIds: ['b'],
    });
    expect(r.todosIndisponiveis).toBe(true);
    expect(r.totalDisponiveis).toBe(0);
    expect(r.disponiveis).toHaveLength(0);
  });

  it('reabre concluídos quando permitirRetrabalho, mas mantém já lançados bloqueados', () => {
    const r = classificarServicos({
      atividades: [ativ('a', 100), ativ('b', 60)],
      lancadasIds: ['b'],
      permitirRetrabalho: true,
    });
    expect(r.itens.find((i) => i.atividade.id === 'a')?.habilitado).toBe(true);
    expect(r.itens.find((i) => i.atividade.id === 'b')?.habilitado).toBe(false);
  });

  it('lista vazia não é considerada totalmente indisponível', () => {
    const r = classificarServicos({ atividades: [], lancadasIds: [] });
    expect(r.todosIndisponiveis).toBe(false);
    expect(r.total).toBe(0);
  });
});
