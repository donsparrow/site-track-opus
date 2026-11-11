import type { RelatorioFinal, RelatorioFinalFoto, SecaoExtra } from '../types';

export interface ItemChecklist { chave: string; etapa: number; ok: boolean; texto: string }
const preenchido = (s: string | null | undefined) => !!s?.trim();
export function checklistLaudo(r: Partial<RelatorioFinal>, fotos: Pick<RelatorioFinalFoto, 'legenda'>[], secoes: SecaoExtra[]): ItemChecklist[] {
  const vazios = secoes.filter(s => !s.conteudo.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim()).length;
  const semLegenda = fotos.filter(f => !preenchido(f.legenda)).length;
  const vistoria = r.tipo_relatorio === 'vistoria_previa';
  return [
    { chave: 'a', etapa: 1, ok: preenchido(r.cliente_nome) && preenchido(r.endereco) && preenchido(r.responsavel), texto: 'Cliente, endereço e responsável preenchidos' },
    { chave: 'b', etapa: 1, ok: preenchido(vistoria ? r.data_vistoria : r.data_conclusao), texto: vistoria ? 'Data da vistoria informada' : 'Data de conclusão informada' },
    { chave: 'c', etapa: 1, ok: !!r.foto_capa_url, texto: 'Foto de capa definida' },
    { chave: 'd', etapa: 2, ok: secoes.length > 0 && vazios === 0, texto: !secoes.length ? 'Nenhum bloco de texto' : vazios ? `${vazios} bloco(s) de texto vazio(s)` : 'Todos os blocos com texto' },
    { chave: 'e', etapa: 3, ok: fotos.length > 0 && semLegenda === 0, texto: !fotos.length ? 'Nenhuma foto adicionada' : semLegenda ? `${semLegenda} foto(s) sem legenda` : 'Todas as fotos com legenda' },
    { chave: 'f', etapa: 4, ok: !!r.assinatura_empresa_url, texto: 'Assinatura do responsável técnico' },
  ];
}