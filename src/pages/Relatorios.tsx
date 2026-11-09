import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { statusLiberacaoLote } from '@/features/relatorios/pdfArquivado';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

import { useObrasRelatorios, useEmpresaConfig } from '@/features/relatorios/hooks/useObrasRelatorios';
import { useNomeAssinante } from '@/features/relatorios/hooks/useNomeAssinante';
import { fmt } from '@/features/relatorios/utils';
import { useRelatorios } from '@/features/relatorios/hooks/useRelatorios';
import { useRelatorioMutations } from '@/features/relatorios/hooks/useRelatorioMutations';
import FiltrosRelatorios from '@/features/relatorios/components/FiltrosRelatorios';
import RelatoriosLista from '@/features/relatorios/components/RelatoriosLista';
import RelatorioSkeleton from '@/features/relatorios/components/RelatorioSkeleton';
import ErroCarregamento from '@/features/relatorios/components/ErroCarregamento';
import type { RelatorioComObra, ViewMode } from '@/features/relatorios/types';

/** Editor carregado sob demanda (inclui o canvas de assinatura). */
const RelatorioEditor = lazy(() => import('@/features/relatorios/components/RelatorioEditor'));
const AssinarDialog = lazy(() => import('@/features/relatorios/components/AssinarDialog'));

export default function Relatorios() {
  const { pode } = usePermissions();
  const { role, user } = useAuth();
  const operacional = role === 'admin' || role === 'trabalhador' || role === 'super_admin';
  const isCliente = role === 'sindico' || role === 'cliente';
  const nomeAssinante = useNomeAssinante();
  const [assinandoRel, setAssinandoRel] = useState<RelatorioComObra | null>(null);
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
  const listaQuery = useRelatorios({ obraId: filtroObra, status: filtroStatus === 'aguardando_liberacao' ? '' : filtroStatus });
  const ids = listaQuery.relatorios.filter((r) => r.status === 'assinado').map((r) => r.id).sort();
  const liberacaoQuery = useQuery({
    queryKey: ['relatorio-liberacao', 'lote', user?.id, ids],
    enabled: (operacional || isCliente) && listaQuery.isSuccess,
    queryFn: () => statusLiberacaoLote(ids),
  });
  const liberacoes = liberacaoQuery.data ?? {};
  const relatorios = filtroStatus === 'aguardando_liberacao'
    ? listaQuery.relatorios.filter((r) => liberacoes[r.id]?.pendente)
    : listaQuery.relatorios;
  const m = useRelatorioMutations();
  const [searchParams, setSearchParams] = useSearchParams();
  const assinarParam = searchParams.get('assinar');

  // Atalho do Painel da Obra: abre direto o diálogo de assinatura do relatório indicado.
  useEffect(() => {
    if (!assinarParam || !isCliente || !listaQuery.isSuccess) return;
    const alvo = listaQuery.relatorios.find((r) => r.id === assinarParam);
    if (alvo) setAssinandoRel(alvo);
    setSearchParams({}, { replace: true });
  }, [assinarParam, isCliente, listaQuery.isSuccess, listaQuery.relatorios, setSearchParams]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Relatórios</h1>
        {podeCriar && (
          <Button onClick={() => abrir(null, false)} className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
            <FileText className="h-4 w-4 mr-2" />Novo Relatório
          </Button>
        )}
      </div>

      <FiltrosRelatorios
        obras={obras}
        operacional={operacional}
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
          relatorios={relatorios}
          liberacoes={liberacoes}
          mostrarPendenciaEmpresa={operacional}
          cliente={isCliente ? { userId: user?.id } : undefined}
          onAssinar={(r) => setAssinandoRel(r)}
          podeEditar={podeEditar}
          podeExcluir={podeExcluir}
          onBaixar={(r) => m.baixarDaLista.mutate({ relatorio: r, empresa })}
          onVisualizar={(r) => abrir(r, true)}
          onEditar={(r) => abrir(r, false)}
          onExcluir={(r) => m.excluir.mutate(r.id)}
        />
      )}
      {assinandoRel && (
        <Suspense fallback={<RelatorioSkeleton rows={2} />}>
          <AssinarDialog
            open={!!assinandoRel}
            onOpenChange={(open) => { if (!open) setAssinandoRel(null); }}
            tipoFixo="cliente"
            nomeInicial={nomeAssinante.data}
            subtitulo={`${assinandoRel.obras?.nome || '—'} — ${assinandoRel.data_inicio ? fmt(assinandoRel.data_inicio) : '—'} a ${assinandoRel.data_fim ? fmt(assinandoRel.data_fim) : '—'}`}
            saving={m.assinarComoCliente.isPending}
            onConfirm={(values) => {
              if (!assinandoRel) return;
              m.assinarComoCliente.mutate({ relatorioId: assinandoRel.id, ...values }, { onSuccess: () => setAssinandoRel(null) });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
