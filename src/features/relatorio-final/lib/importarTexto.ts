import type { SecaoExtra } from '../types';

/** Texto sem formatação: usado na prévia e para saber se um bloco tem conteúdo. */
export const textoPuro = (html: string | null | undefined) =>
  (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Versão escapada para HTML do texto (& → &amp;). */
export const escaparHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Troca `de` por `para` sem diferenciar maiúsculas/minúsculas. Considera também a
 * forma escapada do nome (ex.: "J&A" aparece como "J&amp;A" no HTML do bloco) e
 * não faz nada quando um dos nomes falta ou quando os dois são iguais.
 */
export function substituirNome(
  texto: string,
  de: string | null | undefined,
  para: string | null | undefined,
): string {
  if (!texto || !de || !para) return texto;
  const origem = de.trim();
  const destino = para.trim();
  if (!origem || !destino || origem.toLowerCase() === destino.toLowerCase()) return texto;

  const formas: [string, string][] = [];
  const escapada = escaparHtml(origem);
  if (escapada !== origem) formas.push([escapada, escaparHtml(destino)]);
  formas.push([origem, destino]);

  let out = texto;
  for (const [forma, alvo] of formas) {
    out = out.replace(new RegExp(escaparRegex(forma), 'gi'), () => alvo);
  }
  return out;
}

export interface NomesLaudo {
  obraOrigem?: string | null;
  obraAtual?: string | null;
  clienteOrigem?: string | null;
  clienteAtual?: string | null;
}

const aplicarNomes = (texto: string, n: NomesLaudo) =>
  substituirNome(substituirNome(texto, n.obraOrigem, n.obraAtual), n.clienteOrigem, n.clienteAtual);

/**
 * Acrescenta os blocos escolhidos AO FIM dos blocos atuais — nunca substitui nem
 * apaga nada. Cada bloco importado recebe id novo, passa pela troca automática de
 * obra/cliente e a ordem é reindexada. Blocos sem texto são ignorados.
 */
export function importarSecoes(
  atuais: SecaoExtra[],
  blocos: SecaoExtra[],
  nomes: NomesLaudo,
): SecaoExtra[] {
  const novos = blocos
    .filter((b) => textoPuro(b.conteudo))
    .map((b) => ({
      id: crypto.randomUUID(),
      titulo: aplicarNomes(b.titulo ?? '', nomes),
      conteudo: aplicarNomes(b.conteudo ?? '', nomes),
      ordem: 0,
    }));
  return [...atuais, ...novos].map((s, i) => ({ ...s, ordem: i }));
}
