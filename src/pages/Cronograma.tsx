import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCronogramaPage } from '@/features/cronograma/hooks/useCronogramaPage';
import SelecionarObraCard from '@/features/cronograma/components/SelecionarObraCard';
import CronogramaHeader from '@/features/cronograma/components/CronogramaHeader';
import ProgressoGeralCard from '@/features/cronograma/components/ProgressoGeralCard';
import IndicadoresCard from '@/features/cronograma/components/IndicadoresCard';
import AditivosCard from '@/features/cronograma/components/AditivosCard';
import AtividadesCard from '@/features/cronograma/components/AtividadesCard';
import GanttCard from '@/features/cronograma/components/GanttCard';
import AtividadeDialog from '@/features/cronograma/components/AtividadeDialog';
import AditivoDialog from '@/features/cronograma/components/AditivoDialog';
import ConfirmarExclusaoDialog from '@/features/cronograma/components/ConfirmarExclusaoDialog';
import ImportarCronogramaDialog from '@/features/cronograma/components/ImportarCronogramaDialog';

export default function Cronograma() {
  const p = useCronogramaPage();

  if (!p.obraId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Cronograma de Obra</h1>
        <SelecionarObraCard obras={p.obras} onSelect={p.selecionarObra} />
      </div>
    );
  }

  const { atividadesQuery } = p;
  const primeiroLoad = atividadesQuery.isPending && !atividadesQuery.isPlaceholderData;

  return (
    <div className="space-y-6">
      <CronogramaHeader
        obraNome={p.obraNome}
        obraId={p.obraId}
        obras={p.obras}
        canEdit={p.canEdit}
        onSelectObra={p.selecionarObra}
        onExportPdf={p.exportPDF}
        onNovoAditivo={p.openNewAditivo}
        onImportar={() => p.setImportOpen(true)}
        onNovaAtividade={() => p.openNew('original')}
      />

      {atividadesQuery.isError ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o cronograma.</p>
          <Button variant="outline" onClick={() => atividadesQuery.refetch()}>Tentar novamente</Button>
        </div>
      ) : primeiroLoad ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <ProgressoGeralCard
            progressoGeral={p.indicadores.progressoGeral}
            totalPeso={p.indicadores.totalPeso}
            pesoValido={p.indicadores.pesoValido}
            temAtividades={p.atividades.length > 0}
          />
          <IndicadoresCard
            planejamentoConfigurado={p.indicadores.planejamentoConfigurado}
            statusObra={p.indicadores.statusObra}
            progressoGeral={p.indicadores.progressoGeral}
            prazoConsumido={p.indicadores.prazoConsumido}
            desvio={p.indicadores.desvio}
            diasDecorridos={p.indicadores.diasDecorridos}
            prazoEfetivo={p.indicadores.prazoEfetivo}
            diasAditivos={p.indicadores.diasAditivos}
          />
          <AditivosCard aditivos={p.aditivos} canEdit={p.canEdit} onDelete={p.setDeleteAditivoId} />
          <AtividadesCard
            atividades={p.atividades}
            totalPeso={p.indicadores.totalPeso}
            pesoValido={p.indicadores.pesoValido}
            canEdit={p.canEdit}
            onMove={p.moveAtividade}
            onEdit={p.openEdit}
            onDelete={p.setDeleteId}
          />
          <GanttCard ganttData={p.ganttData} />
        </>
      )}

      <AtividadeDialog
        open={p.dialogOpen}
        onOpenChange={p.setDialogOpen}
        editingAtividade={p.editingAtividade}
        formData={p.formData}
        setFormData={p.setFormData}
        atividades={p.atividades}
        canEditPeso={p.canEditPeso}
        onSave={p.handleSave}
      />

      <AditivoDialog
        open={p.aditivoDialogOpen}
        onOpenChange={p.setAditivoDialogOpen}
        form={p.aditivoForm}
        setForm={p.setAditivoForm}
        onSave={p.handleSaveAditivo}
      />

      <ConfirmarExclusaoDialog
        open={!!p.deleteAditivoId}
        onOpenChange={() => p.setDeleteAditivoId(null)}
        titulo="Excluir Aditivo"
        descricao="Esta ação não pode ser desfeita. O prazo da obra será recalculado."
        onConfirm={p.handleDeleteAditivo}
      />

      <ConfirmarExclusaoDialog
        open={!!p.deleteId}
        onOpenChange={() => p.setDeleteId(null)}
        titulo="Excluir Atividade"
        descricao="Tem certeza que deseja excluir esta atividade?"
        onConfirm={p.handleDelete}
      />

      <ImportarCronogramaDialog
        open={p.importOpen}
        onOpenChange={p.setImportOpen}
        cronogramaId={p.cronograma?.id || null}
        startOrdem={p.atividades.length > 0 ? Math.max(...p.atividades.map(a => a.ordem)) : 0}
        onImported={() => atividadesQuery.refetch()}
      />
    </div>
  );
}
