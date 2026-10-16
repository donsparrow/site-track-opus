import type { AditivoAtividadeForm, Atividade } from './types';

/** Updates deliberately omit progress/status so concurrent daily entries are preserved. */
export function planejarAtividadesAditivo(
  aditivoId: string,
  existentes: Atividade[],
  linhas: AditivoAtividadeForm[],
) {
  const vinculadas = existentes.filter(a => a.aditivo_id === aditivoId);
  const ids = new Set(vinculadas.map(a => a.id));
  const mantidas = new Set<string>();
  const novas: AditivoAtividadeForm[] = [];
  const atualizadas: { id: string; values: {
    nome_atividade: string; peso: number; data_inicio: string | null; data_fim: string | null;
    tipo_atividade: string; aditivo_id: string;
  } }[] = [];
  for (const linha of linhas) {
    if (!linha.id) { novas.push(linha); continue; }
    if (!ids.has(linha.id) || mantidas.has(linha.id)) throw new Error('Atividade inválida para este aditivo. Reabra a edição.');
    mantidas.add(linha.id);
    atualizadas.push({ id: linha.id, values: {
      nome_atividade: linha.nome_atividade.trim(), peso: linha.peso,
      data_inicio: linha.data_inicio || null, data_fim: linha.data_fim || null,
      tipo_atividade: 'aditivo', aditivo_id: aditivoId,
    } });
  }
  return { novas, atualizadas, removidas: vinculadas.filter(a => !mantidas.has(a.id)).map(a => a.id) };
}