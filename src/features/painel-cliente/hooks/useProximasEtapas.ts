import { useCronograma } from '@/features/cronograma/hooks/useCronograma';
import { useCronogramaAtividades } from '@/features/cronograma/hooks/useCronogramaAtividades';

/** Até 5 atividades não concluídas, por data de início (mesma fonte do Cronograma). */
export function useProximasEtapas(obraId: string) {
  const cron = useCronograma(obraId, false);
  const ativ = useCronogramaAtividades(cron.cronograma?.id ?? null);
  const etapas = ativ.atividades
    .filter((a) => a.percentual_concluido < 100 && a.status !== 'concluido')
    .sort((a, b) => (a.data_inicio || '9999').localeCompare(b.data_inicio || '9999'))
    .slice(0, 10);
  return {
    etapas,
    isLoading: cron.isLoading || (!!cron.cronograma && ativ.isLoading),
    isError: cron.isError || ativ.isError,
  };
}
