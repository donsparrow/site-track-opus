import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDocumentacaoController } from '@/features/documentacao/hooks/useDocumentacaoController';
import DocumentacaoSkeleton from '@/features/documentacao/components/DocumentacaoSkeleton';
import ErroCarregamento from '@/features/documentacao/components/ErroCarregamento';
import PastasPanel from '@/features/documentacao/components/PastasPanel';
import ArquivosPanel from '@/features/documentacao/components/ArquivosPanel';
import PastaFormDialog from '@/features/documentacao/components/PastaFormDialog';
import ConfirmarExclusaoDialog from '@/features/documentacao/components/ConfirmarExclusaoDialog';
import PreviewDialog from '@/features/documentacao/components/PreviewDialog';

export default function Documentacao() {
  const c = useDocumentacaoController();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Documentação</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground">Obra:</label>
            <Select value={c.obraSelecionada} onValueChange={c.setObraSelecionada} disabled={c.obrasLoading}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Selecione uma obra" />
              </SelectTrigger>
              <SelectContent>
                {c.obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!c.obraSelecionada && (
        <p className="text-muted-foreground text-center py-12">Selecione uma obra para visualizar a documentação.</p>
      )}

      {c.obraSelecionada && c.pastasLoading && !c.pastas.length && <DocumentacaoSkeleton />}

      {c.obraSelecionada && c.pastasError && (
        <ErroCarregamento onRetry={c.refetchPastas} />
      )}

      {c.obraSelecionada && !c.pastasError && (!c.pastasLoading || c.pastas.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PastasPanel
            pastas={c.pastas}
            loading={c.pastasLoading}
            pastaAberta={c.pastaAberta}
            canManage={c.canManage}
            onSelect={c.setPastaAberta}
            onNovaPasta={() => c.setNovaPastaOpen(true)}
            onEditarPasta={c.abrirEditarPasta}
            onExcluirPasta={c.setDeletePastaId}
          />

          {c.arquivosError ? (
            <div className="md:col-span-2">
              <ErroCarregamento message="Não foi possível carregar os arquivos." onRetry={c.refetchArquivos} />
            </div>
          ) : (
            <ArquivosPanel
              pastaAtual={c.pastaAtual}
              pastaAberta={c.pastaAberta}
              arquivos={c.arquivos}
              canManage={c.canManage}
              uploading={c.uploading}
              onUpload={c.uploadSubmit}
              onExcluirArquivo={c.setDeleteArquivo}
              onPreview={c.abrirPreview}
              onToggleVisibilidade={c.alternarVisibilidadeArquivo}
            />
          )}
        </div>
      )}

      <PastaFormDialog
        open={c.novaPastaOpen}
        title="Nova Pasta"
        value={c.novaPastaNome}
        onChange={c.setNovaPastaNome}
        onClose={() => c.setNovaPastaOpen(false)}
        onConfirm={c.criarPastaSubmit}
        confirmLabel="Criar"
      />

      <PastaFormDialog
        open={!!c.editPasta}
        title="Editar nome da pasta"
        value={c.editPastaNome}
        onChange={c.setEditPastaNome}
        onClose={c.fecharEditarPasta}
        onConfirm={c.renomearPastaSubmit}
        confirmLabel="Salvar"
      />

      <ConfirmarExclusaoDialog
        open={!!c.deletePastaId}
        title="Excluir pasta?"
        description="Todos os arquivos dentro desta pasta serão excluídos permanentemente."
        onClose={() => c.setDeletePastaId(null)}
        onConfirm={c.excluirPastaSubmit}
      />

      <ConfirmarExclusaoDialog
        open={!!c.deleteArquivo}
        title="Excluir arquivo?"
        description="Este arquivo será excluído permanentemente."
        onClose={() => c.setDeleteArquivo(null)}
        onConfirm={c.excluirArquivoSubmit}
      />

      <PreviewDialog url={c.previewUrl} tipo={c.previewTipo} onClose={c.fecharPreview} />
    </div>
  );
}
