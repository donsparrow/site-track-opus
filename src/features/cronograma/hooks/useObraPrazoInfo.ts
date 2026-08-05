import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cronogramaKeys } from '../queryKeys';

export interface ObraPrazoInfo {
  prazoContratual: number;
  primeiroDiario: string | null;
}

/** Prazo contratual da obra + data do primeiro diário registrado. */
export function useObraPrazoInfo(obraId: string) {
  const query = useQuery({
    queryKey: cronogramaKeys.obraPrazo(obraId),
    enabled: !!obraId,
    queryFn: async (): Promise<ObraPrazoInfo> => {
      const [obraRes, diarioRes] = await Promise.all([
        supabase.from('obras').select('prazo_contratual_dias').eq('id', obraId).maybeSingle(),
        supabase.from('diario_obra').select('data').eq('obra_id', obraId).order('data', { ascending: true }).limit(1),
      ]);
      if (obraRes.error) throw obraRes.error;
      if (diarioRes.error) throw diarioRes.error;
      return {
        prazoContratual: obraRes.data?.prazo_contratual_dias || 0,
        primeiroDiario: diarioRes.data?.[0]?.data || null,
      };
    },
  });

  return {
    ...query,
    prazoContratual: query.data?.prazoContratual ?? 0,
    primeiroDiario: query.data?.primeiroDiario ?? null,
  };
}
