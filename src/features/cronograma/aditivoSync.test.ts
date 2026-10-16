import { describe, expect, it } from 'vitest';
import { planejarAtividadesAditivo } from './aditivoSync';
import type { Atividade } from './types';

const atividade = (id: string, aditivo_id: string | null): Atividade => ({
  id, aditivo_id, cronograma_id: 'cron', nome_atividade: 'Serviço', peso: 40,
  percentual_concluido: 65, status: 'em_andamento', ordem: 1,
  tipo_atividade: aditivo_id ? 'aditivo' : 'original', data_inicio: null, data_fim: null,
  descricao: null, observacoes: null, created_at: '', updated_at: '',
});

describe('sincronização de atividades do aditivo', () => {
  it('atualiza nome e peso por id sem sobrescrever progresso 65% ou status em andamento', () => {
    const existente = atividade('a', 'ad');
    const plano = planejarAtividadesAditivo('ad', [existente], [{ id: 'a', nome_atividade: 'Novo nome', peso: 60, data_inicio: '', data_fim: '' }]);
    expect(plano.atualizadas).toEqual([{ id: 'a', values: { nome_atividade: 'Novo nome', peso: 60, data_inicio: null, data_fim: null, tipo_atividade: 'aditivo', aditivo_id: 'ad' } }]);
    expect(plano.atualizadas[0].values).not.toHaveProperty('percentual_concluido');
    expect(plano.atualizadas[0].values).not.toHaveProperty('status');
    expect(existente.percentual_concluido).toBe(65);
    expect(existente.status).toBe('em_andamento');
  });
  it('insere novas e remove somente as atividades excluídas deste aditivo, nunca do escopo original', () => {
    const nova = { nome_atividade: 'Nova', peso: 100, data_inicio: '', data_fim: '' };
    const plano = planejarAtividadesAditivo('ad', [atividade('remover', 'ad'), atividade('original', null), atividade('outro', 'outro-ad')], [nova]);
    expect(plano.novas).toEqual([nova]);
    expect(plano.removidas).toEqual(['remover']);
  });
  it('rejeita id pertencente a outro aditivo', () => {
    expect(() => planejarAtividadesAditivo('ad', [atividade('outro', 'outro-ad')], [{ id: 'outro', nome_atividade: 'X', peso: 100, data_inicio: '', data_fim: '' }])).toThrow();
  });
});