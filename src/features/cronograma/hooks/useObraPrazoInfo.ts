import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';
import { prazoContratualBase } from '@/lib/prazoObra';

export interface ParalisacaoPrazo { data_inicio: string; data_fim: string | null }

export interface ObraPrazoInfo {
  prazoContratual: number;
  primeiroDiario: string | null;
  /** Maior data de diário da obra (null se não houver diário). */
  ultimoDiario: string | null;
  obraStatus: string | null;
  dataFimPrevista: string | null;
  datasDiarios: string[];
  paralisacoes: ParalisacaoPrazo[];
}

/** Prazo contratual da obra, datas dos diários e paralisações registradas. */
export function useObraPrazoInfo(obraId: string) {
  const query = useQuery({
    queryKey: cronogramaKeys.obraPrazo(obraId),
    enabled: !!obraId,
    queryFn: async (): Promise<ObraPrazoInfo> => {
      const [obraRes, diarioRes] = await Promise.all([
        supabase.from('obras').select('prazo_contratual_dias, status, data_fim_prevista, data_inicio').eq('id', obraId).maybeSingle(),
        supabase.from('diario_obra').select('id, data').eq('obra_id', obraId),
      ]);
      if (obraRes.error) throw obraRes.error;
      if (diarioRes.error) throw diarioRes.error;
      const diarios = diarioRes.data ?? [];
      const datasDiarios = diarios.map(d => d.data as string).filter(Boolean).sort();
      const ids = diarios.map(d => d.id);
      let paralisacoes: ParalisacaoPrazo[] = [];
      if (ids.length) {
        const parRes = await supabase.from('diario_paralisacoes').select('data_inicio, data_fim').in('diario_id', ids);
        if (parRes.error) throw parRes.error;
        paralisacoes = (parRes.data ?? []).filter(p => p.data_inicio) as ParalisacaoPrazo[];
      }
      return {
        prazoContratual: prazoContratualBase(obraRes.data ?? {}),
        primeiroDiario: datasDiarios[0] ?? null,
        ultimoDiario: datasDiarios[datasDiarios.length - 1] ?? null,
        obraStatus: (obraRes.data?.status as string | null) ?? null,
        dataFimPrevista: obraRes.data?.data_fim_prevista || null,
        datasDiarios,
        paralisacoes,
      };
    },
  });

  return {
    ...query,
    prazoContratual: query.data?.prazoContratual ?? 0,
    primeiroDiario: query.data?.primeiroDiario ?? null,
    ultimoDiario: query.data?.ultimoDiario ?? null,
    obraStatus: query.data?.obraStatus ?? null,
    dataFimPrevista: query.data?.dataFimPrevista ?? null,
    datasDiarios: query.data?.datasDiarios ?? [],
    paralisacoes: query.data?.paralisacoes ?? [],
  };
}
