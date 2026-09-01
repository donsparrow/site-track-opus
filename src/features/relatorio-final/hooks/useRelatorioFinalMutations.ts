import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { extractAnexoPath } from '@/lib/anexoUrl';
import { relatorioFinalKeys } from '../queryKeys';
import type { RelatorioFinal, TipoFoto } from '../types';

const sanitize = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-');

export async function uploadRelatorioFinalArquivo(obraId: string, file: Blob, fileName: string) {
  const path = `relatorio-final/${obraId}/${crypto.randomUUID()}_${sanitize(fileName)}`;
  const { error } = await supabase.storage.from('anexos').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function useRelatorioFinalMutations(
  obraId: string | null,
  relatorioId: string | null,
  tipoRelatorio: string = 'entrega_obra'
) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: relatorioFinalKeys.relatorio(obraId, tipoRelatorio) });
    qc.invalidateQueries({ queryKey: relatorioFinalKeys.fotos(relatorioId) });
  };

  const salvar = useMutation({
    mutationFn: async (values: Partial<RelatorioFinal>) => {
      if (!relatorioId) throw new Error('Relatório não encontrado');
      const { error } = await supabase.from('relatorios_finais').update(values).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Relatório salvo'); invalidate(); },
    onError: (e) => toast.error(`Erro ao salvar: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const uploadCapa = useMutation({
    mutationFn: async (file: File) => {
      if (!obraId || !relatorioId) throw new Error('Relatório não encontrado');
      const path = await uploadRelatorioFinalArquivo(obraId, file, file.name);
      const { error } = await supabase.from('relatorios_finais').update({ foto_capa_url: path }).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Capa atualizada'); invalidate(); },
    onError: (e) => toast.error(`Erro no upload: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const uploadTemplateCapa = useMutation({
    mutationFn: async (file: File) => {
      if (!obraId || !relatorioId) throw new Error('Relatório não encontrado');
      const path = await uploadRelatorioFinalArquivo(obraId, file, file.name);
      const { error } = await supabase.from('relatorios_finais').update({ template_capa_url: path }).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Template da capa atualizado'); invalidate(); },
    onError: (e) => toast.error(`Erro no upload: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const removerTemplateCapa = useMutation({
    mutationFn: async (templateUrl: string | null) => {
      if (!relatorioId) throw new Error('Relatório não encontrado');
      const { error } = await supabase.from('relatorios_finais').update({ template_capa_url: null }).eq('id', relatorioId);
      if (error) throw error;
      const path = extractAnexoPath(templateUrl || '');
      if (path) await supabase.storage.from('anexos').remove([path]);
    },
    onSuccess: () => { toast.success('Template removido'); invalidate(); },
    onError: (e) => toast.error(`Erro ao remover template: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const adicionarFotos = useMutation({
    mutationFn: async ({ files, tipo, ordemInicial }: { files: File[]; tipo: TipoFoto; ordemInicial: number }) => {
      if (!obraId || !relatorioId) throw new Error('Relatório não encontrado');
      let ordem = ordemInicial;
      for (const file of files) {
        const path = await uploadRelatorioFinalArquivo(obraId, file, file.name);
        const { error } = await supabase.from('relatorio_final_fotos').insert({
          relatorio_id: relatorioId, foto_url: path, tipo, ordem: ordem++,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Fotos adicionadas'); invalidate(); },
    onError: (e) => toast.error(`Erro ao enviar fotos: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const atualizarFoto = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; legenda?: string | null; ordem?: number; tipo?: TipoFoto }) => {
      const { error } = await supabase.from('relatorio_final_fotos').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(`Erro ao atualizar foto: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const excluirFoto = useMutation({
    mutationFn: async ({ id, fotoUrl }: { id: string; fotoUrl: string }) => {
      const { error } = await supabase.from('relatorio_final_fotos').delete().eq('id', id);
      if (error) throw error;
      const path = extractAnexoPath(fotoUrl);
      if (path) await supabase.storage.from('anexos').remove([path]);
    },
    onSuccess: () => { toast.success('Foto removida'); invalidate(); },
    onError: (e) => toast.error(`Erro ao remover foto: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const assinar = useMutation({
    mutationFn: async ({ tipo, dataUrl, nome, cargo }: { tipo: 'empresa' | 'sindico'; dataUrl: string; nome: string; cargo: string }) => {
      if (!obraId || !relatorioId) throw new Error('Relatório não encontrado');
      const blob = await (await fetch(dataUrl)).blob();
      const path = await uploadRelatorioFinalArquivo(obraId, blob, `assinatura-${tipo}.png`);
      const values = tipo === 'empresa'
        ? { assinatura_empresa_url: path, assinatura_empresa_nome: nome, assinatura_empresa_cargo: cargo, assinatura_empresa_data: new Date().toISOString().slice(0, 10) }
        : { assinatura_sindico_url: path, assinatura_sindico_nome: nome, assinatura_sindico_cargo: cargo, assinatura_sindico_data: new Date().toISOString().slice(0, 10) };
      const { error } = await supabase.from('relatorios_finais').update(values).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Assinatura registrada'); invalidate(); },
    onError: (e) => toast.error(`Erro ao assinar: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const removerAssinatura = useMutation({
    mutationFn: async (tipo: 'empresa' | 'sindico') => {
      if (!relatorioId) throw new Error('Relatório não encontrado');
      const values = tipo === 'empresa'
        ? { assinatura_empresa_url: null, assinatura_empresa_nome: null, assinatura_empresa_cargo: null, assinatura_empresa_data: null }
        : { assinatura_sindico_url: null, assinatura_sindico_nome: null, assinatura_sindico_cargo: null, assinatura_sindico_data: null };
      const { error } = await supabase.from('relatorios_finais').update(values).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Assinatura removida'); invalidate(); },
    onError: (e) => toast.error(`Erro ao remover assinatura: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  return { salvar, uploadCapa, uploadTemplateCapa, removerTemplateCapa, adicionarFotos, atualizarFoto, excluirFoto, assinar, removerAssinatura };
}
