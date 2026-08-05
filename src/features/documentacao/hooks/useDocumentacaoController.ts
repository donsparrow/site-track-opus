import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasDocumentacao } from './useObrasDocumentacao';
import { usePastas } from './usePastas';
import { useArquivos } from './useArquivos';
import { useDocumentacaoMutations } from './useDocumentacaoMutations';
import type { Arquivo, Pasta } from '../types';

/** Orquestra estado de UI + dados do módulo de Documentação. */
export function useDocumentacaoController() {
  const { role, empresaId } = useAuth();
  const canManage = role === 'admin' || role === 'trabalhador';

  const [obraSelecionada, setObraSelecionadaState] = useState('');
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

  const setObraSelecionada = (obraId: string) => {
    setObraSelecionadaState(obraId);
    setPastaAberta(null);
  };

  const abrirEditarPasta = (pasta: Pasta) => {
    setEditPasta(pasta);
    setEditPastaNome(pasta.nome_pasta);
  };

  const criarPastaSubmit = () => {
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

  const renomearPastaSubmit = () => {
    if (!editPasta || !editPastaNome.trim()) return;
    renomearPasta.mutate(
      { id: editPasta.id, obraId: obraSelecionada, nome: editPastaNome.trim() },
      { onSuccess: () => { setEditPasta(null); setEditPastaNome(''); } },
    );
  };

  const excluirPastaSubmit = () => {
    if (!deletePastaId) return;
    excluirPasta.mutate(
      { id: deletePastaId, obraId: obraSelecionada },
      { onSuccess: () => { if (pastaAberta === deletePastaId) setPastaAberta(null); } },
    );
    setDeletePastaId(null);
  };

  const uploadSubmit = (files: File[]) => {
    if (!pastaAberta) return;
    setUploading(true);
    uploadArquivos.mutate(
      { obraId: obraSelecionada, pastaId: pastaAberta, files },
      { onSettled: () => setUploading(false) },
    );
  };

  const excluirArquivoSubmit = () => {
    if (!deleteArquivo || !pastaAberta) return;
    excluirArquivo.mutate({ id: deleteArquivo.id, pastaId: pastaAberta, urlArquivo: deleteArquivo.url_arquivo });
    setDeleteArquivo(null);
  };

  const abrirPreview = (url: string, tipo: string) => {
    setPreviewUrl(url);
    setPreviewTipo(tipo);
  };

  return {
    canManage,
    obras,
    obrasLoading,
    obraSelecionada,
    setObraSelecionada,
    pastas,
    pastasLoading,
    pastasError,
    refetchPastas,
    pastaAberta,
    setPastaAberta,
    pastaAtual,
    arquivos,
    arquivosLoading,
    arquivosError,
    refetchArquivos,
    uploading,
    novaPastaOpen,
    setNovaPastaOpen,
    novaPastaNome,
    setNovaPastaNome,
    criarPastaSubmit,
    editPasta,
    editPastaNome,
    setEditPastaNome,
    abrirEditarPasta,
    fecharEditarPasta: () => setEditPasta(null),
    renomearPastaSubmit,
    deletePastaId,
    setDeletePastaId,
    excluirPastaSubmit,
    deleteArquivo,
    setDeleteArquivo,
    excluirArquivoSubmit,
    uploadSubmit,
    previewUrl,
    previewTipo,
    abrirPreview,
    fecharPreview: () => setPreviewUrl(null),
  };
}
