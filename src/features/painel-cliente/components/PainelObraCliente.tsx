import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardErrorBoundary from '@/components/dashboard/DashboardErrorBoundary';
import { usePermissions } from '@/hooks/usePermissions';
import { useObrasPainel } from '../hooks/useObrasPainel';
import CabecalhoObraCard from './CabecalhoObraCard';
import AguardandoAssinaturaCard from './AguardandoAssinaturaCard';
import DiariosRecentesCard from './DiariosRecentesCard';
import ProximasEtapasCard from './ProximasEtapasCard';
import DocumentosRecentesCard from './DocumentosRecentesCard';
import PagamentosCard from './PagamentosCard';

const FALHA = 'Não foi possível carregar esta seção.';

/** Painel da Obra para síndico, cliente e trabalhador; com obraId mostra só aquela obra. */
export default function PainelObraCliente({ obraId: obraFixa }: { obraId?: string } = {}) {
  const { obras, isLoading } = useObrasPainel();
  const { role } = useAuth();
  const { pode, loading: permLoading } = usePermissions();
  const trabalhador = role === 'trabalhador';
  const podeLaudos = pode('relatorio_final', 'visualizar');
  const podeRelatorios = pode('relatorios', 'visualizar');
  const podeArquivos = pode('documentos', 'visualizar');
  const podeDiario = pode('diario_obra', 'visualizar');
  const podeCronograma = pode('cronograma', 'visualizar');
  const [selecionada, setSelecionada] = useState('');
  const obraId = obraFixa ?? selecionada;

  useEffect(() => {
    if (!obraFixa && obras.length && !obras.some((o) => o.id === selecionada)) setSelecionada(obras[0].id);
  }, [obras, selecionada, obraFixa]);

  const obra = obras.find((o) => o.id === obraId);
  if (obraFixa && !isLoading && !obra) return <Navigate to="/obras" replace />;
  const carregando = isLoading || permLoading;

  return (
    <div className="space-y-6">
      {obraFixa && (
        <nav aria-label="Trilha" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
          <Link to="/obras" className="shrink-0 hover:underline">Obras</Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium text-foreground">{obra?.nome ?? '…'}</span>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Painel da Obra</h1>
        {!obraFixa && obras.length > 1 && (
          <Select value={selecionada} onValueChange={setSelecionada}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Obra"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
            <SelectContent>{obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {carregando ? (
        <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : !obra ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma obra vinculada ao seu acesso. Fale com a J&amp;A Engenharia.</CardContent></Card>
      ) : (
        <div key={obra.id} className="space-y-6">
          <DashboardErrorBoundary fallbackTitle={FALHA}><CabecalhoObraCard obra={obra} /></DashboardErrorBoundary>
          {!trabalhador && (podeLaudos || podeRelatorios) && (
            <DashboardErrorBoundary fallbackTitle={FALHA}><AguardandoAssinaturaCard obraId={obra.id} podeLaudos={podeLaudos} podeRelatorios={podeRelatorios} /></DashboardErrorBoundary>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            {podeDiario && <DashboardErrorBoundary fallbackTitle={FALHA}><DiariosRecentesCard obraId={obra.id} /></DashboardErrorBoundary>}
            <div className="min-w-0 space-y-6">
              {podeCronograma && <DashboardErrorBoundary fallbackTitle={FALHA}><ProximasEtapasCard obraId={obra.id} /></DashboardErrorBoundary>}
              {(podeLaudos || podeRelatorios || podeArquivos) && (
                <DashboardErrorBoundary fallbackTitle={FALHA}><DocumentosRecentesCard obraId={obra.id} podeLaudos={podeLaudos} podeRelatorios={podeRelatorios} podeArquivos={podeArquivos} /></DashboardErrorBoundary>
              )}
            </div>
          </div>
          {!trabalhador && obra.exibir_pagamentos_cliente && (
            <DashboardErrorBoundary fallbackTitle={FALHA}><PagamentosCard obraId={obra.id} /></DashboardErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
