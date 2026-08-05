import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

import { useObrasRelatorios, useEmpresaConfig } from '@/features/relatorios/hooks/useObrasRelatorios';
import { useRelatorios } from '@/features/relatorios/hooks/useRelatorios';
import { useRelatorioMutations } from '@/features/relatorios/hooks/useRelatorioMutations';
import FiltrosRelatorios from '@/features/relatorios/components/FiltrosRelatorios';
import RelatoriosLista from '@/features/relatorios/components/RelatoriosLista';
import RelatorioSkeleton from '@/features/relatorios/components/RelatorioSkeleton';
import ErroCarregamento from '@/features/relatorios/components/ErroCarregamento';
import type { RelatorioComObra, ViewMode } from '@/features/relatorios/types';

/** Editor carregado sob demanda (inclui o canvas de assinatura). */
const RelatorioEditor = lazy(() => import('@/features/relatorios/components/RelatorioEditor'));

export default function Relatorios() {
  const { pode } = usePermissions();
  const podeCriar = pode('relatorios', 'criar');
  const podeEditar = pode('relatorios', 'editar');
  const podeExcluir = pode('relatorios', 'excluir');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [readOnly, setReadOnly] = useState(false);
  const [relatorioAtual, setRelatorioAtual] = useState<RelatorioComObra | null>(null);
  const [filtroObra, setFiltroObra] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const { obras } = useObrasRelatorios();
  const { empresa } = useEmpresaConfig();
  const listaQuery = useRelatorios({ obraId: filtroObra, status: filtroStatus });
  const m = useRelatorioMutations();

  const abrir = (rel: RelatorioComObra | null, somenteLeitura: boolean) => {
    setRelatorioAtual(rel);
    setReadOnly(somenteLeitura || !podeEditar);
    setViewMode('edit');
  };

  if (viewMode === 'edit') {
    return (
      <Suspense fallback={<RelatorioSkeleton rows={8} />}>
        <RelatorioEditor
          obras={obras}
          empresa={empresa}
          relatorioInicial={relatorioAtual}
          readOnly={readOnly}
          podeEditar={podeEditar}
          onVoltar={() => { setViewMode('list'); setRelatorioAtual(null); listaQuery.refetch(); }}
        />
      </Suspense>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Relatórios</h1>
        {podeCriar && (
          <Button onClick={() => abrir(null, false)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <FileText className="h-4 w-4 mr-2" />Novo Relatório
          </Button>
        )}
      </div>

      <FiltrosRelatorios
        obras={obras}
        filtroObra={filtroObra}
        filtroStatus={filtroStatus}
        onFiltroObra={(v) => setFiltroObra(v === 'all' ? '' : v)}
        onFiltroStatus={(v) => setFiltroStatus(v === 'all' ? '' : v)}
        onLimpar={() => { setFiltroObra(''); setFiltroStatus(''); }}
      />

      {listaQuery.isError ? (
        <ErroCarregamento onRetry={() => listaQuery.refetch()} />
      ) : listaQuery.isPending ? (
        <RelatorioSkeleton />
      ) : (
        <RelatoriosLista
          relatorios={listaQuery.relatorios}
          podeEditar={podeEditar}
          podeExcluir={podeExcluir}
          onBaixar={(r) => m.baixarDaLista.mutate({ relatorio: r, empresa })}
          onVisualizar={(r) => abrir(r, true)}
          onEditar={(r) => abrir(r, false)}
          onExcluir={(r) => m.excluir.mutate(r.id)}
        />
      )}
    </div>
  );
}
