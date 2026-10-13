import type { RelatorioFinal, SecaoExtra } from '../types';

function parseLista(raw: unknown): SecaoExtra[] | null {
  if (raw == null) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as SecaoExtra[]) : null;
  } catch {
    return null;
  }
}

const porOrdem = (a: SecaoExtra, b: SecaoExtra) => (a.ordem ?? 0) - (b.ordem ?? 0);

/** Lista única e ordenada de blocos do laudo (novo formato `secoes` ou fallback legado). */
export function resolverSecoes(relatorio: RelatorioFinal): SecaoExtra[] {
  let lista: SecaoExtra[];
  const novas = parseLista((relatorio as RelatorioFinal & { secoes?: unknown }).secoes);

  if (novas) {
    lista = [...novas].sort(porOrdem);
  } else if (relatorio.tipo_relatorio === 'vistoria_previa') {
    const extras = (parseLista(relatorio.secoes_extras) ?? []).sort(porOrdem);
    lista = [
      { id: 'legado_introducao', titulo: relatorio.titulo_introducao || 'Introdução', conteudo: relatorio.conteudo_introducao ?? '', ordem: 0 },
      ...extras,
      { id: 'legado_conclusao', titulo: relatorio.titulo_conclusao || 'Conclusão', conteudo: relatorio.conteudo_conclusao ?? '', ordem: 0 },
    ];
  } else {
    lista = [
      { id: 'legado_introducao', titulo: relatorio.titulo_introducao || 'Introdução', conteudo: relatorio.conteudo_introducao ?? '', ordem: 0 },
      { id: 'legado_garantia', titulo: relatorio.titulo_garantia || 'Garantia', conteudo: relatorio.conteudo_garantia ?? '', ordem: 0 },
      { id: 'legado_aditivo', titulo: relatorio.titulo_aditivo || 'Aditivos', conteudo: relatorio.conteudo_aditivo ?? '', ordem: 0 },
      { id: 'legado_conclusao', titulo: relatorio.titulo_conclusao || 'Conclusão', conteudo: relatorio.conteudo_conclusao ?? '', ordem: 0 },
    ];
  }

  return lista.map((s, i) => ({ ...s, conteudo: s.conteudo ?? '', ordem: i }));
}
