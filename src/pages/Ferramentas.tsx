import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFerramentas } from '@/features/ferramentas/hooks/useFerramentas';
import { useObrasFerramentas } from '@/features/ferramentas/hooks/useObrasFerramentas';
import { useFerramentaHistorico } from '@/features/ferramentas/hooks/useFerramentaHistorico';
import { useFerramentasMutations } from '@/features/ferramentas/hooks/useFerramentasMutations';
import ResumoStatusCards from '@/features/ferramentas/components/ResumoStatusCards';
import FiltrosFerramentas from '@/features/ferramentas/components/FiltrosFerramentas';
import TabelaFerramentas from '@/features/ferramentas/components/TabelaFerramentas';
import TabelaSkeleton from '@/features/ferramentas/components/TabelaSkeleton';
import ErroCarregamento from '@/features/ferramentas/components/ErroCarregamento';
import FerramentaFormDialog from '@/features/ferramentas/components/FerramentaFormDialog';
import ManutencaoDialog from '@/features/ferramentas/components/ManutencaoDialog';
import HistoricoDialog from '@/features/ferramentas/components/HistoricoDialog';
import ExcluirFerramentaDialog from '@/features/ferramentas/components/ExcluirFerramentaDialog';
import type { Ferramenta, FerramentaFormValues, ManutencaoFormValues } from '@/features/ferramentas/types';

export default function Ferramentas() {
  const { canEdit, empresaId } = useAuth();
  const { obras } = useObrasFerramentas();
  const { ferramentas, isLoading, isError, refetch } = useFerramentas();
  const mutations = useFerramentasMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFerramenta, setEditFerramenta] = useState<Ferramenta | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [manutencaoOpen, setManutencaoOpen] = useState(false);
  const [manutencaoFerramentaId, setManutencaoFerramentaId] = useState<string | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoFerramentaId, setHistoricoFerramentaId] = useState<string | null>(null);

  const [filtroObra, setFiltroObra] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busca, setBusca] = useState('');

  const { historico } = useFerramentaHistorico(historicoFerramentaId, historicoOpen);

  const filtered = ferramentas.filter((f) => {
    if (filtroObra !== 'todas' && f.obra_id !== filtroObra) return false;
    if (filtroStatus !== 'todos' && f.status !== filtroStatus) return false;
    if (filtroTipo !== 'todos' && f.tipo !== filtroTipo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!f.nome.toLowerCase().includes(q) && !f.numero_cadastro.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleSave = (values: FerramentaFormValues) => {
    mutations.salvarFerramenta.mutate(
      { editId: editFerramenta?.id ?? null, values, ferramentas, obras },
      { onSuccess: () => { setDialogOpen(false); setEditFerramenta(null); } },
    );
  };

  const handleManutencao = (values: ManutencaoFormValues) => {
    const ferramenta = ferramentas.find((f) => f.id === manutencaoFerramentaId);
    if (!ferramenta) return;
    mutations.registrarManutencao.mutate(
      { ferramenta, data: values.data, valor: values.valor, local: values.local, anexo: values.anexo, empresaId },
      { onSuccess: () => setManutencaoOpen(false) },
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    mutations.excluirFerramenta.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Ferramentas</h1>
          <p className="text-muted-foreground mt-1">Controle de equipamentos</p>
        </div>
        {canEdit && (
          <Button
            onClick={() => { setEditFerramenta(null); setDialogOpen(true); }}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Ferramenta
          </Button>
        )}
      </div>

      <ResumoStatusCards ferramentas={ferramentas} />

      <FiltrosFerramentas
        obras={obras}
        filtroObra={filtroObra}
        setFiltroObra={setFiltroObra}
        filtroStatus={filtroStatus}
        setFiltroStatus={setFiltroStatus}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        busca={busca}
        setBusca={setBusca}
      />

      {isLoading ? (
        <TabelaSkeleton />
      ) : isError ? (
        <ErroCarregamento onRetry={() => refetch()} />
      ) : (
        <TabelaFerramentas
          ferramentas={filtered}
          obras={obras}
          canEdit={!!canEdit}
          onEdit={(f) => { setEditFerramenta(f); setDialogOpen(true); }}
          onDelete={setDeleteId}
          onManutencao={(id) => { setManutencaoFerramentaId(id); setManutencaoOpen(true); }}
          onHistorico={(id) => { setHistoricoFerramentaId(id); setHistoricoOpen(true); }}
          onStatusChange={(ferramenta, novoStatus) => mutations.alterarStatus.mutate({ ferramenta, novoStatus })}
          onObraChange={(ferramenta, novaObraId) =>
            mutations.alterarObra.mutate({ ferramenta, novaObraId, obras, empresaId })
          }
        />
      )}

      <FerramentaFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditFerramenta(null); }}
        editFerramenta={editFerramenta}
        obras={obras}
        onSave={handleSave}
        saving={mutations.salvarFerramenta.isPending}
      />

      <ManutencaoDialog
        open={manutencaoOpen}
        onOpenChange={setManutencaoOpen}
        onSubmit={handleManutencao}
        saving={mutations.registrarManutencao.isPending}
      />

      <HistoricoDialog open={historicoOpen} onOpenChange={setHistoricoOpen} historico={historico} />

      <ExcluirFerramentaDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
