import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useObrasDocumentacao } from '@/features/documentacao/hooks/useObrasDocumentacao';
import { usePastas } from '@/features/documentacao/hooks/usePastas';
import { useArquivos } from '@/features/documentacao/hooks/useArquivos';
import { useDocumentacaoMutations } from '@/features/documentacao/hooks/useDocumentacaoMutations';
import DocumentacaoSkeleton from '@/features/documentacao/components/DocumentacaoSkeleton';
import ErroCarregamento from '@/features/documentacao/components/ErroCarregamento';
import PastasPanel from '@/features/documentacao/components/PastasPanel';
import ArquivosPanel from '@/features/documentacao/components/ArquivosPanel';
import PastaFormDialog from '@/features/documentacao/components/PastaFormDialog';
import ConfirmarExclusaoDialog from '@/features/documentacao/components/ConfirmarExclusaoDialog';
import PreviewDialog from '@/features/documentacao/components/PreviewDialog';
import { toast } from 'sonner';
import type { Arquivo, Pasta } from '@/features/documentacao/types';

export default function Documentacao() {
  const { role, empresaId } = useAuth();
  const canManage = role === 'admin' || role === 'trabalhador';

  const [obraSelecionada, setObraSelecionada] = useState('');
  const [pastaAberta, setPastaAberta] = useState<string | null>(null);

  const [novaPastaOpen, setNovaPastaOpen] = useState(false);
  const [novaPastaNome, setNovaPastaNome] = useState('');
  const [editPasta, setEditPasta] = useState<Pasta | null>(null);
  const [editPastaNome, setEditPastaNome] = useState('');
  const [deletePastaId, setDeletePastaId] = useState<string | null>(null);
  const [deleteArquivo, setDeleteArquivo] = useState<Arquivo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTipo, setPreviewTipo] = useState('');
  const [uploading, setUploading] = useState(false);

  const { obras, isLoading: obrasLoading } = useObrasDocumentacao();
  const {
    pastas,
    isLoading: pastasLoading,
    isError: pastasError,
    refetch: refetchPastas,
  } = usePastas(obraSelecionada || null);
  const {
    arquivos,
    isLoading: arquivosLoading,
    isError: arquivosError,
    refetch: refetchArquivos,
  } = useArquivos(pastaAberta);
  const { criarPasta, renomearPasta, excluirPasta, uploadArquivos, excluirArquivo } = useDocumentacaoMutations();

  const pastaAtual = pastas.find((p) => p.id === pastaAberta);

  const handleCriarPasta = () => {
    if (!novaPastaNome.trim() || !obraSelecionada) return;
    if (!empresaId) {
      toast.error('Não foi possível identificar a empresa do usuário.');
      return;
    }
    criarPasta.mutate(
      { obraId: obraSelecionada, empresaId, nome: novaPastaNome.trim() },
      { onSuccess: () => { setNovaPastaOpen(false); setNovaPastaNome(''); } },
    );
  };

  const handleRenomearPasta = () => {
    if (!editPasta || !editPastaNome.trim()) return;
    renomearPasta.mutate(
      { id: editPasta.id, obraId: obraSelecionada, nome: editPastaNome.trim() },
      { onSuccess: () => { setEditPasta(null); setEditPastaNome(''); } },
    );
  };

  const handleExcluirPasta = () => {
    if (!deletePastaId) return;
    excluirPasta.mutate(
      { id: deletePastaId, obraId: obraSelecionada },
      {
        onSuccess: () => {
          if (pastaAberta === deletePastaId) setPastaAberta(null);
        },
      },
    );
    setDeletePastaId(null);
  };

  const handleUpload = (files: File[]) => {
    if (!pastaAberta) return;
    setUploading(true);
    uploadArquivos.mutate(
      { obraId: obraSelecionada, pastaId: pastaAberta, files },
      { onSettled: () => setUploading(false) },
    );
  };

  const handleExcluirArquivo = () => {
    if (!deleteArquivo || !pastaAberta) return;
    excluirArquivo.mutate({ id: deleteArquivo.id, pastaId: pastaAberta, urlArquivo: deleteArquivo.url_arquivo });
    setDeleteArquivo(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Documentação</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground">Obra:</label>
            <Select value={obraSelecionada} onValueChange={(v) => { setObraSelecionada(v); setPastaAberta(null); }} disabled={obrasLoading}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Selecione uma obra" />
              </SelectTrigger>
              <SelectContent>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!obraSelecionada && (
        <p className="text-muted-foreground text-center py-12">Selecione uma obra para visualizar a documentação.</p>
      )}

      {obraSelecionada && pastasLoading && !pastas.length && <DocumentacaoSkeleton />}

      {obraSelecionada && pastasError && (
        <ErroCarregamento onRetry={refetchPastas} />
      )}

      {obraSelecionada && !pastasError && (!pastasLoading || pastas.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PastasPanel
            pastas={pastas}
            loading={pastasLoading}
            pastaAberta={pastaAberta}
            canManage={canManage}
            onSelect={setPastaAberta}
            onNovaPasta={() => setNovaPastaOpen(true)}
            onEditarPasta={(p) => { setEditPasta(p); setEditPastaNome(p.nome_pasta); }}
            onExcluirPasta={setDeletePastaId}
          />

          {arquivosError ? (
            <div className="md:col-span-2">
              <ErroCarregamento message="Não foi possível carregar os arquivos." onRetry={refetchArquivos} />
            </div>
          ) : (
            <ArquivosPanel
              pastaAtual={pastaAtual}
              pastaAberta={pastaAberta}
              arquivos={arquivos}
              canManage={canManage}
              uploading={uploading || arquivosLoading && !!pastaAberta && arquivos.length === 0}
              onUpload={handleUpload}
              onExcluirArquivo={setDeleteArquivo}
              onPreview={(url, tipo) => { setPreviewUrl(url); setPreviewTipo(tipo); }}
            />
          )}
        </div>
      )}

      <PastaFormDialog
        open={novaPastaOpen}
        title="Nova Pasta"
        value={novaPastaNome}
        onChange={setNovaPastaNome}
        onClose={() => setNovaPastaOpen(false)}
        onConfirm={handleCriarPasta}
        confirmLabel="Criar"
      />

      <PastaFormDialog
        open={!!editPasta}
        title="Editar nome da pasta"
        value={editPastaNome}
        onChange={setEditPastaNome}
        onClose={() => setEditPasta(null)}
        onConfirm={handleRenomearPasta}
        confirmLabel="Salvar"
      />

      <ConfirmarExclusaoDialog
        open={!!deletePastaId}
        title="Excluir pasta?"
        description="Todos os arquivos dentro desta pasta serão excluídos permanentemente."
        onClose={() => setDeletePastaId(null)}
        onConfirm={handleExcluirPasta}
      />

      <ConfirmarExclusaoDialog
        open={!!deleteArquivo}
        title="Excluir arquivo?"
        description="Este arquivo será excluído permanentemente."
        onClose={() => setDeleteArquivo(null)}
        onConfirm={handleExcluirArquivo}
      />

      <PreviewDialog url={previewUrl} tipo={previewTipo} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
