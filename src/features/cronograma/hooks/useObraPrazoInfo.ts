import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';

export interface ObraPrazoInfo {
  prazoContratual: number;
  primeiroDiario: string | null;
  /** Maior data de diário da obra (null se não houver diário). */
  ultimoDiario: string | null;
  obraStatus: string | null;
  dataFimPrevista: string | null;
}

/** Prazo contratual da obra + datas do primeiro e último diário registrados. */
export function useObraPrazoInfo(obraId: string) {
  const query = useQuery({
    queryKey: cronogramaKeys.obraPrazo(obraId),
    enabled: !!obraId,
    queryFn: async (): Promise<ObraPrazoInfo> => {
      const [obraRes, diarioRes, ultimoRes] = await Promise.all([
        supabase.from('obras').select('prazo_contratual_dias, status, data_fim_prevista').eq('id', obraId).maybeSingle(),
        supabase.from('diario_obra').select('data').eq('obra_id', obraId).order('data', { ascending: true }).limit(1),
        supabase.from('diario_obra').select('data').eq('obra_id', obraId).order('data', { ascending: false }).limit(1),
      ]);
      if (obraRes.error) throw obraRes.error;
      if (diarioRes.error) throw diarioRes.error;
      if (ultimoRes.error) throw ultimoRes.error;
      return {
        prazoContratual: obraRes.data?.prazo_contratual_dias || 0,
        primeiroDiario: diarioRes.data?.[0]?.data || null,
        ultimoDiario: ultimoRes.data?.[0]?.data || null,
        obraStatus: (obraRes.data?.status as string | null) ?? null,
        dataFimPrevista: obraRes.data?.data_fim_prevista || null,
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
  };
}
