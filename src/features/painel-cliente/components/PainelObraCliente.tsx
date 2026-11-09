import { useEffect, useState } from 'react';
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

/** Painel da Obra para síndico e cliente (mesma tela para os dois papéis). */
export default function PainelObraCliente() {
  const { obras, isLoading } = useObrasPainel();
  const { pode } = usePermissions();
  const podeLaudos = pode('relatorio_final', 'visualizar');
  const [obraId, setObraId] = useState('');

  useEffect(() => {
    if (obras.length && !obras.some((o) => o.id === obraId)) setObraId(obras[0].id);
  }, [obras, obraId]);

  const obra = obras.find((o) => o.id === obraId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Painel da Obra</h1>
        {obras.length > 1 && (
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Obra"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
            <SelectContent>{obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : !obra ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma obra vinculada ao seu acesso. Fale com a J&amp;A Engenharia.</CardContent></Card>
      ) : (
        <div key={obra.id} className="space-y-6">
          <DashboardErrorBoundary fallbackTitle={FALHA}><CabecalhoObraCard obra={obra} /></DashboardErrorBoundary>
          <DashboardErrorBoundary fallbackTitle={FALHA}><AguardandoAssinaturaCard obraId={obra.id} podeLaudos={podeLaudos} /></DashboardErrorBoundary>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardErrorBoundary fallbackTitle={FALHA}><DiariosRecentesCard obraId={obra.id} /></DashboardErrorBoundary>
            <div className="space-y-6">
              <DashboardErrorBoundary fallbackTitle={FALHA}><ProximasEtapasCard obraId={obra.id} /></DashboardErrorBoundary>
              <DashboardErrorBoundary fallbackTitle={FALHA}><DocumentosRecentesCard obraId={obra.id} podeLaudos={podeLaudos} /></DashboardErrorBoundary>
            </div>
          </div>
          {obra.exibir_pagamentos_cliente && (
            <DashboardErrorBoundary fallbackTitle={FALHA}><PagamentosCard obraId={obra.id} /></DashboardErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
