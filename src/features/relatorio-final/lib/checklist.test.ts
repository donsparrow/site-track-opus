import { describe, expect, it } from 'vitest';
import { checklistLaudo } from './checklist';
import { diffLaudo } from './autosave';
const bloco = { id: '1', titulo: 'Texto', conteudo: '<p>Concluído</p>', ordem: 0 };
describe('checklist informativo', () => {
  it('exige cliente, endereço e responsável preenchidos', () => {
    expect(checklistLaudo({ cliente_nome: 'Cliente', endereco: 'Rua', responsavel: ' ' }, [], [])[0].ok).toBe(false);
    expect(checklistLaudo({ cliente_nome: 'Cliente', endereco: 'Rua', responsavel: 'Engenheiro' }, [], [])[0].ok).toBe(true);
  });
  it('usa conclusão para entrega e vistoria para vistoria prévia', () => {
    expect(checklistLaudo({ tipo_relatorio: 'entrega_obra', data_vistoria: '2026-11-11' }, [], [])[1].ok).toBe(false);
    expect(checklistLaudo({ tipo_relatorio: 'entrega_obra', data_conclusao: '2026-11-11' }, [], [])[1].ok).toBe(true);
    expect(checklistLaudo({ tipo_relatorio: 'vistoria_previa', data_conclusao: '2026-11-11' }, [], [])[1].ok).toBe(false);
    expect(checklistLaudo({ tipo_relatorio: 'vistoria_previa', data_vistoria: '2026-11-11' }, [], [])[1].ok).toBe(true);
  });
  it('exige foto de capa', () => {
    expect(checklistLaudo({ foto_capa_url: null }, [], [])[2].ok).toBe(false);
    expect(checklistLaudo({ foto_capa_url: 'capa.png' }, [], [])[2].ok).toBe(true);
  });
  it('exige ao menos um bloco e nenhum texto vazio', () => {
    expect(checklistLaudo({}, [], [])[3].ok).toBe(false);
    expect(checklistLaudo({}, [], [bloco, { ...bloco, conteudo: '<p>&nbsp;</p>' }])[3].ok).toBe(false);
    expect(checklistLaudo({}, [], [bloco])[3].ok).toBe(true);
  });
  it('exige ao menos uma foto e todas com legenda', () => {
    expect(checklistLaudo({}, [], [])[4].ok).toBe(false);
    expect(checklistLaudo({}, [{ legenda: ' ' }], [])[4].ok).toBe(false);
    expect(checklistLaudo({}, [{ legenda: 'Fachada' }], [])[4].ok).toBe(true);
  });
  it('verifica assinatura técnica separadamente', () => {
    expect(checklistLaudo({}, [], [])[5].ok).toBe(false);
    expect(checklistLaudo({ assinatura_empresa_url: 'assinatura.png' }, [], [])[5].ok).toBe(true);
  });
});
describe('diff do salvamento', () => {
  it('envia somente campos alterados, nunca colunas legadas ou assinaturas', () => {
    expect(diffLaudo({ contrato: 'Novo', cliente_nome: 'Cliente', conteudo_introducao: 'Legado', assinatura_empresa_url: 'assinatura' }, { contrato: 'Antigo', cliente_nome: 'Cliente' })).toEqual({ contrato: 'Novo' });
    expect(diffLaudo({ contrato: 'Igual' }, { contrato: 'Igual' })).toEqual({});
  });
});