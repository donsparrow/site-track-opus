import { Cloud, CloudRain, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Status derivado do percentual informado no diário. */
export function percentualToStatus(p: number): string {
  if (p <= 0) return 'nao iniciado';
  if (p >= 100) return 'concluido';
  return 'andamento';
}

/** Suporte ao status legado 'executado'. */
export function mapLegacyStatus(s: string) {
  return s === 'executado' ? 'concluido' : s;
}

export const climaIcons: Record<string, LucideIcon> = { sol: Sun, nublado: Cloud, chuva: CloudRain };
export const climaLabels: Record<string, string> = { sol: 'Sol', nublado: 'Nublado', chuva: 'Chuva' };

export const statusLabels: Record<string, string> = {
  concluido: 'Concluído',
  andamento: 'Em andamento',
  'nao iniciado': 'Não iniciado',
  // legacy support
  executado: 'Concluído',
};

/** Status do cronograma correspondente ao percentual da atividade. */
export function cronogramaStatus(percentual: number) {
  return percentual >= 100 ? 'concluido' : percentual > 0 ? 'em_andamento' : 'nao_iniciado';
}

/** Total de dias úteis (seg–sex, inclusivo) entre início e fim (0 quando sem fim). */
export function totalDiasParalisacao(inicio: string, fim?: string | null) {
  if (!fim) return 0;
  return calcBusinessDays(inicio, fim);
}

export const fmtData = (data: string) => new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
