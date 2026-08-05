import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { extractAnexoPath } from '@/lib/anexoUrl';
import { documentacaoKeys } from '../queryKeys';
import type { TipoArquivo } from '../types';

interface CriarPastaInput {
  obraId: string;
  empresaId: string;
  nome: string;
}

interface RenomearPastaInput {
  id: string;
  obraId: string;
  nome: string;
}

interface ExcluirPastaInput {
  id: string;
  obraId: string;
}

interface UploadArquivosInput {
  obraId: string;
  pastaId: string;
  files: File[];
}

interface ExcluirArquivoInput {
  id: string;
  pastaId: string;
  urlArquivo: string;
}

const getFileExtension = (fileName: string) => fileName.split('.').pop()?.trim().toLowerCase() ?? '';

const getTipoArquivo = (file: File): TipoArquivo | null => {
  const extension = getFileExtension(file.name);
  const isPdf = extension === 'pdf' || file.type === 'application/pdf' || file.type === 'application/x-pdf';
  const isImage = ['jpg', 'jpeg', 'png'].includes(extension) || file.type === 'image/jpeg' || file.type === 'image/png';

  if (isPdf) return 'pdf';
  if (isImage) return 'imagem';
  return null;
};

const buildStoragePath = (obraId: string, pastaId: string, fileName: string) => {
  const safeName = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '-');

  return `documentos/${obraId}/${pastaId}/${crypto.randomUUID()}_${safeName}`;
};

export function useDocumentacaoMutations() {
  const qc = useQueryClient();

  const invalidatePastas = (obraId: string) =>
    qc.invalidateQueries({ queryKey: documentacaoKeys.pastas(obraId) });

  const invalidateArquivos = (pastaId: string) =>
    qc.invalidateQueries({ queryKey: documentacaoKeys.arquivos(pastaId) });

  const criarPasta = useMutation({
    mutationFn: async ({ obraId, empresaId, nome }: CriarPastaInput) => {
      const { error } = await supabase.from('documentos_pastas').insert({
        obra_id: obraId,
        nome_pasta: nome,
        empresa_id: empresaId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { obraId }) => {
      toast.success('Pasta criada com sucesso');
      invalidatePastas(obraId);
    },
    onError: (error) => toast.error(`Erro ao criar pasta: ${error instanceof Error ? error.message : 'desconhecido'}`),
  });

  const renomearPasta = useMutation({
    mutationFn: async ({ id, nome }: RenomearPastaInput) => {
      const { error } = await supabase.from('documentos_pastas').update({ nome_pasta: nome }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { obraId }) => {
      toast.success('Nome da pasta atualizado com sucesso');
      invalidatePastas(obraId);
    },
    onError: () => toast.error('Erro ao renomear pasta'),
  });

  const excluirPasta = useMutation({
    mutationFn: async ({ id }: ExcluirPastaInput) => {
      const { data: files } = await supabase.from('documentos_arquivos').select('id, url_arquivo').eq('pasta_id', id);
      if (files && files.length > 0) {
        for (const f of files) {
          if (f.url_arquivo) {
            const path = extractAnexoPath(f.url_arquivo);
            if (path) await supabase.storage.from('anexos').remove([path]);
          }
        }
      }
      const { error } = await supabase.from('documentos_pastas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { obraId }) => {
      toast.success('Pasta excluída');
      invalidatePastas(obraId);
    },
    onError: () => toast.error('Erro ao excluir pasta'),
  });

  const uploadArquivos = useMutation({
    mutationFn: async ({ obraId, pastaId, files }: UploadArquivosInput) => {
      const maxFileSize = 20 * 1024 * 1024;
      let uploadedCount = 0;
      const uploadErrors: string[] = [];

      for (const file of files) {
        const tipo = getTipoArquivo(file);

        if (!tipo) {
          uploadErrors.push(`Tipo não permitido: ${file.name}. Envie PDF, JPG ou PNG.`);
          continue;
        }

        if (file.size > maxFileSize) {
          uploadErrors.push(`Arquivo muito grande: ${file.name}. O limite é 20MB.`);
          continue;
        }

        const path = buildStoragePath(obraId, pastaId, file.name);

        try {
          const resposta = await supabase.storage.from('anexos').upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          });

          if (resposta.error || !resposta.data?.path) {
            throw new Error(resposta.error?.message || `Falha no upload do arquivo ${file.name}.`);
          }

          const { error: insertErr } = await supabase.from('documentos_arquivos').insert({
            pasta_id: pastaId,
            nome_arquivo: file.name,
            tipo,
            url_arquivo: resposta.data.path,
            tamanho: file.size,
          });

          if (insertErr) {
            await supabase.storage.from('anexos').remove([resposta.data.path]);
            throw new Error(`Erro ao salvar registro: ${insertErr.message}`);
          }

          uploadedCount += 1;
        } catch (erro) {
          uploadErrors.push(
            erro instanceof Error ? `${file.name}: ${erro.message}` : `${file.name}: erro desconhecido no upload`,
          );
        }
      }

      return { uploadedCount, uploadErrors };
    },
    onSuccess: ({ uploadedCount, uploadErrors }, { pastaId }) => {
      if (uploadedCount > 0) invalidateArquivos(pastaId);

      if (uploadErrors.length === 0 && uploadedCount > 0) {
        toast.success(uploadedCount === 1 ? 'Upload concluído com sucesso.' : 'Uploads concluídos com sucesso.');
        return;
      }

      if (uploadErrors.length > 0) {
        toast.error(
          uploadedCount > 0
            ? `Upload parcial: ${uploadedCount} arquivo(s) enviado(s) e ${uploadErrors.length} falharam. ${uploadErrors[0]}`
            : uploadErrors[0],
        );
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Falha ao concluir upload.'),
  });

  const excluirArquivo = useMutation({
    mutationFn: async ({ id, urlArquivo }: ExcluirArquivoInput) => {
      const path = extractAnexoPath(urlArquivo);
      if (path) await supabase.storage.from('anexos').remove([path]);
      const { error } = await supabase.from('documentos_arquivos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { pastaId }) => {
      toast.success('Arquivo excluído');
      invalidateArquivos(pastaId);
    },
    onError: () => toast.error('Erro ao excluir arquivo'),
  });

  const alternarVisibilidade = useMutation({
    mutationFn: async ({ id, visivel }: { id: string; pastaId: string; visivel: boolean }) => {
      const { error } = await supabase
        .from('documentos_arquivos')
        .update({ visivel_cliente: visivel })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { pastaId, visivel }) => {
      toast.success(visivel ? 'Arquivo liberado para cliente/síndico' : 'Arquivo restrito à equipe');
      invalidateArquivos(pastaId);
    },
    onError: () => toast.error('Erro ao alterar visibilidade do arquivo'),
  });

  return {
    criarPasta,
    alternarVisibilidade,
    renomearPasta,
    excluirPasta,
    uploadArquivos,
    excluirArquivo,
  };
}
