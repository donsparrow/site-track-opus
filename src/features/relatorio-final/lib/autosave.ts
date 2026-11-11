import type { RelatorioFinal } from '../types';
export const camposAuto = ['cliente_nome', 'cliente_cpf_cnpj', 'endereco', 'responsavel', 'data_inicio', 'data_conclusao', 'data_vistoria', 'contrato', 'link_externo_label', 'link_externo', 'foto_capa_escala', 'secoes'] as const;
export function diffLaudo(atual: Partial<RelatorioFinal>, salvo: Partial<RelatorioFinal>): Partial<RelatorioFinal> {
  return Object.fromEntries(camposAuto.filter(k => JSON.stringify(atual[k]) !== JSON.stringify(salvo[k])).map(k => [k, atual[k]]));
}