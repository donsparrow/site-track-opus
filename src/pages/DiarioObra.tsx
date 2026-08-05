import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sun } from 'lucide-react';
import { useObrasDiario, useObraSelecionada } from '@/features/diario/hooks/useObrasDiario';
import { useDiarios } from '@/features/diario/hooks/useDiarios';
import { useDiarioDetail } from '@/features/diario/hooks/useDiarioDetail';
import { useCronogramaAtividades } from '@/features/diario/hooks/useCronogramaAtividades';
import { useDiarioMutations } from '@/features/diario/hooks/useDiarioMutations';
import { ListaDiarios } from '@/features/diario/components/ListaDiarios';
import { PrazoContratualCard } from '@/features/diario/components/PrazoContratualCard';
import { NovoDiarioDialog } from '@/features/diario/components/NovoDiarioDialog';
import { ExcluirDiarioDialog } from '@/features/diario/components/ExcluirDiarioDialog';
import { DiarioDetalhe } from '@/features/diario/components/DiarioDetalhe';

export default function DiarioObra() {
  const { canEdit } = useAuth();
  const { obras, isLoading: obrasLoading } = useObrasDiario();
  const { selectedObra, setSelectedObra, obra } = useObraSelecionada(obras);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { diarios, isFetching: diariosLoading } = useDiarios(selectedObra);
  const { diario } = useDiarioDetail(selectedId);
  const { cronogramaAtividades } = useCronogramaAtividades(selectedObra);
  const m = useDiarioMutations({ obraId: selectedObra, diarioId: selectedId });

  useEffect(() => { setSelectedId(null); setEditMode(false); }, [selectedObra]);

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">Diário de Obra</h1>

      <div className="flex gap-4 mb-6">
        <div className="max-w-sm flex-1">
          <Select value={selectedObra} onValueChange={setSelectedObra}>
            <SelectTrigger><SelectValue placeholder={obrasLoading ? 'Carregando obras...' : 'Selecione uma obra'} /></SelectTrigger>
            <SelectContent>
              {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedObra && canEdit && (
          <Button onClick={() => setNovoOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> Novo Diário
          </Button>
        )}
      </div>

      {selectedObra && (
        <>
          <PrazoContratualCard
            prazoAtual={obra?.prazo_contratual_dias || 0}
            onSave={(dias) => m.atualizarPrazoContratual.mutate(dias)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">REGISTROS</h3>
              <ListaDiarios
                diarios={diarios}
                loading={diariosLoading && diarios.length === 0}
                selectedId={selectedId}
                canEditDelete={canEdit}
                onSelect={(d) => { setSelectedId(d.id); setEditMode(false); }}
                onEdit={(d) => { setSelectedId(d.id); setEditMode(true); }}
                onDelete={(id) => setDeleteId(id)}
              />
            </div>

            <div className="lg:col-span-2">
              {diario ? (
                <DiarioDetalhe
                  diario={diario}
                  cronogramaAtividades={cronogramaAtividades}
                  canEdit={canEdit}
                  canEditDelete={canEdit}
                  editMode={editMode}
                  onEnterEdit={() => setEditMode(true)}
                  onCancelEdit={() => setEditMode(false)}
                  onSaveCabecalho={(values) =>
                    m.atualizarCabecalho.mutate({ id: diario.id, values }, { onSuccess: () => setEditMode(false) })
                  }
                  m={m}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Sun className="h-12 w-12 mb-4" />
                  <p>Selecione um diário para ver os detalhes</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <NovoDiarioDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        saving={m.criarDiario.isPending}
        onSubmit={(values) =>
          m.criarDiario.mutate(values, {
            onSuccess: (novo) => { setNovoOpen(false); setSelectedId(novo.id); },
          })
        }
      />

      <ExcluirDiarioDialog
        open={!!deleteId}
        onOpenChange={(v) => { if (!v) setDeleteId(null); }}
        onConfirm={() => {
          if (!deleteId) return;
          m.excluirDiario.mutate(deleteId, {
            onSuccess: () => { if (selectedId === deleteId) setSelectedId(null); setDeleteId(null); },
          });
        }}
      />
    </div>
  );
}
