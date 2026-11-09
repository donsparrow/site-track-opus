import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { painelKeys } from '../queryKeys';

export interface DocumentoRecente {
  id: string;
  titulo: string;
  origem: 'Relatórios' | 'Laudos Técnicos' | 'Documentação';
  data: string;
  link: string;
}

/** Últimos 5 itens liberados ao cliente: relatórios assinados, laudos e arquivos visíveis. */
export function useDocumentosRecentes(obraId: string, podeLaudos: boolean) {
  return useQuery({
    queryKey: painelKeys.documentos(obraId, podeLaudos),
    enabled: !!obraId,
    queryFn: async (): Promise<DocumentoRecente[]> => {
      const [rel, laudos, arqs] = await Promise.all([
        supabase.from('relatorios').select('id, data_inicio, data_fim, updated_at')
          .eq('obra_id', obraId).eq('status', 'assinado').order('updated_at', { ascending: false }).limit(5),
        podeLaudos
          ? supabase.from('relatorios_finais').select('id, tipo_relatorio, updated_at')
              .eq('obra_id', obraId).eq('status', 'assinado').order('updated_at', { ascending: false }).limit(5)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('documentos_arquivos').select('id, nome_arquivo, created_at, documentos_pastas!inner(obra_id)')
          .eq('visivel_cliente', true).eq('documentos_pastas.obra_id', obraId)
          .order('created_at', { ascending: false }).limit(5),
      ]);
      if (rel.error) throw rel.error;
      if (laudos.error) throw laudos.error;
      if (arqs.error) throw arqs.error;
      const f = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');
      const itens: DocumentoRecente[] = [
        ...(rel.data ?? []).map((r) => ({
          id: r.id, titulo: `Relatório ${f(r.data_inicio)} a ${f(r.data_fim)}`, origem: 'Relatórios' as const,
          data: r.updated_at, link: '/relatorios',
        })),
        ...((laudos.data ?? []) as { id: string; tipo_relatorio: string; updated_at: string }[]).map((l) => ({
          id: l.id, titulo: `Laudo — ${l.tipo_relatorio === 'vistoria_previa' ? 'Vistoria Prévia' : 'Entrega de Obra'}`,
          origem: 'Laudos Técnicos' as const, data: l.updated_at,
          link: `/relatorio-final?obra=${obraId}&tipo=${l.tipo_relatorio}`,
        })),
        ...(arqs.data ?? []).map((a) => ({
          id: a.id, titulo: a.nome_arquivo, origem: 'Documentação' as const, data: a.created_at, link: '/documentacao',
        })),
      ];
      return itens.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
    },
  });
}
