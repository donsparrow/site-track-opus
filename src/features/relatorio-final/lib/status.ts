export type StatusLaudo = 'rascunho' | 'aguardando' | 'assinado';
export function statusLaudo(r: { assinatura_empresa_url: string | null; assinatura_sindico_url: string | null }): StatusLaudo {
  if (r.assinatura_empresa_url && r.assinatura_sindico_url) return 'assinado';
  if (r.assinatura_empresa_url) return 'aguardando';
  return 'rascunho';
}
export const tipoLaudo = (tipo: string) => tipo === 'vistoria_previa' ? 'Vistoria Prévia' : 'Entrega de Obra';
export const textoStatusLaudo = (status: StatusLaudo, externo = false) => status === 'rascunho' ? 'Rascunho' : status === 'assinado' ? 'Assinado' : externo ? 'Aguardando sua assinatura' : 'Aguardando cliente';