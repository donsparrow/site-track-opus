// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { statusLaudo } from './status';
describe('status de laudo', () => {
  it('é rascunho quando falta assinatura da empresa', () => {
    expect(statusLaudo({assinatura_empresa_url:null,assinatura_sindico_url:null})).toBe('rascunho');
    expect(statusLaudo({assinatura_empresa_url:null,assinatura_sindico_url:'cliente.png'})).toBe('rascunho');
  });
  it('aguarda cliente com somente assinatura da empresa', () => {
    expect(statusLaudo({assinatura_empresa_url:'empresa.png',assinatura_sindico_url:null})).toBe('aguardando');
  });
  it('é assinado com ambas as assinaturas', () => {
    expect(statusLaudo({assinatura_empresa_url:'empresa.png',assinatura_sindico_url:'cliente.png'})).toBe('assinado');
  });
});