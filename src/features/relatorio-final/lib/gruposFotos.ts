import type { RelatorioFinal, RelatorioFinalFoto } from '../types';
export interface GrupoFotos { chave: string; titulo: string }
export const gruposEntrega: GrupoFotos[] = [{ chave: 'pre_obra', titulo: 'Pré-obra' }, { chave: 'pos_obra', titulo: 'Pós-obra' }];
export function resolverGruposFotos(r: Pick<RelatorioFinal, 'tipo_relatorio' | 'grupos_fotos'>, fotos: Pick<RelatorioFinalFoto, 'tipo'>[]): GrupoFotos[] {
  const entrega = r.tipo_relatorio !== 'vistoria_previa';
  const titulo = (chave: string) => entrega ? gruposEntrega.find(g => g.chave === chave)?.titulo ?? chave : chave;
  const tipos = [...new Set(fotos.map(f => f.tipo))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const json = r.grupos_fotos;
  const valido = Array.isArray(json) && json.every(g => typeof g === 'object' && g !== null && !Array.isArray(g) && typeof g.chave === 'string' && !!g.chave.trim() && typeof g.titulo === 'string' && !!g.titulo.trim()) && new Set(json.map(g => (g as unknown as GrupoFotos).chave)).size === json.length;
  const grupos: GrupoFotos[] = valido ? (json as unknown as GrupoFotos[]).map(g => ({...g})) : entrega ? gruposEntrega.map(g => ({...g})) : tipos.map(chave => ({ chave, titulo: chave }));
  for (const chave of tipos) if (!grupos.some(g => g.chave === chave)) grupos.push({ chave, titulo: titulo(chave) });
  return grupos;
}
export function defaultsNovoLaudo(tipo: string, template: Pick<RelatorioFinal,'template_capa_url' | 'capa_texto_escala'> | null | undefined) {
  return { grupos_fotos: tipo === 'vistoria_previa' ? [] : gruposEntrega.map(g => ({...g})), capa_texto_escala: template?.capa_texto_escala ?? 100 };
}
