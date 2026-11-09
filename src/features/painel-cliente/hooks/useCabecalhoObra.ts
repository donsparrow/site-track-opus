import { useCronograma } from '@/features/cronograma/hooks/useCronograma';
import { useCronogramaAtividades } from '@/features/cronograma/hooks/useCronogramaAtividades';
import { useAditivos } from '@/features/cronograma/hooks/useAditivos';
import { useObraPrazoInfo } from '@/features/cronograma/hooks/useObraPrazoInfo';
import { calcularIndicadores } from '@/features/cronograma/utils';
import { dataNoDiaUtil } from '../utils';

/** Indicadores da obra com a MESMA regra do Cronograma (reutiliza hooks e calcularIndicadores). */
export function useCabecalhoObra(obraId: string) {
  const cron = useCronograma(obraId, false);
  const ativ = useCronogramaAtividades(cron.cronograma?.id ?? null);
  const adit = useAditivos(obraId);
  const prazo = useObraPrazoInfo(obraId);

  const indicadores = calcularIndicadores({
    atividades: ativ.atividades,
    aditivos: adit.aditivos,
    prazoContratual: prazo.prazoContratual,
    primeiroDiario: prazo.primeiroDiario,
    obraStatus: prazo.obraStatus,
    ultimoDiario: prazo.ultimoDiario,
    dataFimPrevista: prazo.dataFimPrevista,
    paralisacoes: prazo.paralisacoes,
    datasDiarios: prazo.datasDiarios,
  });

  // Previsão: prazo efetivo (contrato + aditivos) + dias úteis parados, contados do primeiro diário.
  const previsaoTermino = prazo.obraStatus === 'concluida'
    ? (prazo.ultimoDiario || prazo.dataFimPrevista)
    : prazo.primeiroDiario && indicadores.prazoEfetivo > 0
      ? dataNoDiaUtil(prazo.primeiroDiario, indicadores.prazoEfetivo + indicadores.diasParados)
      : prazo.dataFimPrevista;

  const isLoading = cron.isLoading || adit.isLoading || prazo.isLoading || (!!cron.cronograma && ativ.isLoading);
  const isError = cron.isError || adit.isError || prazo.isError || ativ.isError;
  return { indicadores, previsaoTermino, isLoading, isError };
}
