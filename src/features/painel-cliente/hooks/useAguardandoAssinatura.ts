import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { painelKeys } from '../queryKeys';

export interface ItemAssinatura {
  id: string;
  titulo: string;
  data: string | null;
  origem: 'relatorios' | 'laudos';
  link: string;
}

const tipoLaudo = (t: string) => (t === 'vistoria_previa' ? 'Vistoria Prévia' : 'Entrega de Obra');

/** Relatórios assinados pela empresa ainda sem a assinatura deste usuário e laudos sem assinatura do síndico. */
export function useAguardandoAssinatura(obraId: string, podeLaudos: boolean, podeRelatorios = true) {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  return useQuery({
    queryKey: painelKeys.aguardando(obraId, uid, podeLaudos, podeRelatorios),
    enabled: !!obraId && !!uid && (podeLaudos || podeRelatorios),
    queryFn: async (): Promise<ItemAssinatura[]> => {
      const [relRes, laudoRes] = await Promise.all([
        podeRelatorios
          ? supabase
              .from('relatorios')
              .select('id, data_inicio, data_fim, assinaturas(tipo, assinado_por)')
              .eq('obra_id', obraId)
              .eq('status', 'assinado')
              .order('data_fim', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [] as { id: string; data_inicio: string | null; data_fim: string | null; assinaturas: { tipo: string; assinado_por: string | null }[] }[], error: null }),
        podeLaudos
          ? supabase
              .from('relatorios_finais')
              .select('id, tipo_relatorio, updated_at, assinatura_empresa_data')
              .eq('obra_id', obraId)
              .is('assinatura_sindico_url', null)
              .not('assinatura_empresa_url', 'is', null)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (relRes.error) throw relRes.error;
      if (laudoRes.error) throw laudoRes.error;
      const fmt = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');
      const rels: ItemAssinatura[] = (relRes.data ?? [])
        .filter((r) => !(r.assinaturas ?? []).some((a) => a.tipo === 'cliente' && a.assinado_por === uid))
        .map((r) => ({
          id: r.id,
          titulo: `Relatório ${fmt(r.data_inicio)} a ${fmt(r.data_fim)}`,
          data: r.data_fim,
          origem: 'relatorios',
          link: `/relatorios?assinar=${r.id}`,
        }));
      const laudos: ItemAssinatura[] = ((laudoRes.data ?? []) as { id: string; tipo_relatorio: string; updated_at: string; assinatura_empresa_data: string | null }[])
        .map((l) => ({
          id: l.id,
          titulo: `Laudo — ${tipoLaudo(l.tipo_relatorio)}`,
          data: l.assinatura_empresa_data || l.updated_at,
          origem: 'laudos',
          link: `/relatorio-final?obra=${obraId}&tipo=${l.tipo_relatorio}`,
        }));
      return [...rels, ...laudos];
    },
  });
}
