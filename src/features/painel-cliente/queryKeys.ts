/** Query keys do Painel da Obra (síndico/cliente). Dependem do usuário quando o resultado depende dele. */
export const painelKeys = {
  obras: (userId: string) => ['painel-cliente', 'obras', userId] as const,
  obra: (obraId: string) => ['painel-cliente', 'obra', obraId] as const,
  aguardando: (obraId: string, userId: string, laudos: boolean) => ['painel-cliente', 'aguardando', obraId, userId, laudos] as const,
  diarios: (obraId: string) => ['painel-cliente', 'diarios', obraId] as const,
  documentos: (obraId: string, laudos: boolean) => ['painel-cliente', 'documentos', obraId, laudos] as const,
  pagamentos: (obraId: string) => ['painel-cliente', 'pagamentos', obraId] as const,
};
