import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { extractAnexoPath } from '@/lib/anexoUrl';
import { relatorioFinalKeys } from '../queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import { defaultsNovoLaudo, type GrupoFotos } from '../lib/gruposFotos';
import type { ObraOption, RelatorioFinal, TipoFoto } from '../types';

const sanitize = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-');

const mensagemErro = (erro: unknown, prefixo: string) => {
  const mensagem = typeof erro === 'object' && erro !== null && 'message' in erro && typeof erro.message === 'string'
    ? erro.message : 'desconhecido';
  return mensagem.includes('Laudo assinado') ? mensagem : `${prefixo}: ${mensagem}`;
};

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
  const { empresaId } = useAuth();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: relatorioFinalKeys.lista() });
    qc.invalidateQueries({ queryKey: relatorioFinalKeys.relatorio(obraId, tipoRelatorio) });
    qc.invalidateQueries({ queryKey: relatorioFinalKeys.fotos(relatorioId) });
  };

  const criar = useMutation({
    mutationFn: async ({ obra, tipo }: { obra: ObraOption; tipo: 'entrega_obra' | 'vistoria_previa' }) => {
      const { data: comTemplate } = await supabase.from('relatorios_finais')
        .select('template_capa_url,capa_texto_escala').not('template_capa_url', 'is', null)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle();
      const { error } = await supabase.from('relatorios_finais').insert({
        ...defaultsNovoLaudo(tipo, comTemplate),
        tipo_relatorio: tipo, template_capa_url: comTemplate?.template_capa_url ?? null,
        obra_id: obra.id, empresa_id: empresaId, cliente_nome: obra.clientes?.nome ?? null, cliente_cpf_cnpj: obra.clientes?.cpf_cnpj ?? null,
        endereco: obra.endereco, responsavel: obra.responsavel_tecnico, data_inicio: obra.data_inicio, data_fim_prevista: obra.data_fim_prevista,
      });
      if (error) throw error;
      return { obra: obra.id, tipo };
    },
    onSuccess: ({ obra, tipo }) => {
      toast.success('Laudo criado');
      qc.invalidateQueries({ queryKey: relatorioFinalKeys.lista() });
      qc.invalidateQueries({ queryKey: relatorioFinalKeys.relatorio(obra, tipo) });
    },
    onError: e => toast.error(mensagemErro(e, 'Erro ao criar laudo')),
  });

  const salvar = useMutation({
    mutationFn: async (values: Partial<RelatorioFinal>) => {
      if (!relatorioId) throw new Error('Relatório não encontrado');
      const { error } = await supabase.from('relatorios_finais').update(values).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Relatório salvo'); invalidate(); },
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao salvar')),
  });

  const salvarAuto = useMutation({
    mutationFn: async (values: Partial<RelatorioFinal>) => {
      if (!relatorioId) throw new Error('Relatório não encontrado');
      const { data, error } = await supabase.from('relatorios_finais').update(values).eq('id', relatorioId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      qc.setQueryData(relatorioFinalKeys.relatorio(obraId, tipoRelatorio), data);
      qc.invalidateQueries({ queryKey: relatorioFinalKeys.lista() });
    },
    onError: e => toast.error(mensagemErro(e, 'Erro ao salvar')),
  });

  const salvarGruposFotos = useMutation({
    mutationFn: async (grupos: GrupoFotos[]) => {
      if (!relatorioId) throw new Error('Relatório não encontrado');
      const { data, error } = await supabase.from('relatorios_finais').update({ grupos_fotos: grupos.map(g => ({ ...g })) }).eq('id', relatorioId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      qc.setQueryData(relatorioFinalKeys.relatorio(obraId, tipoRelatorio), data);
      qc.invalidateQueries({ queryKey: relatorioFinalKeys.lista() });
    },
    onError: e => toast.error(mensagemErro(e, 'Erro ao salvar divisões')),
  });

  const uploadCapa = useMutation({
    mutationFn: async (file: File) => {
      if (!obraId || !relatorioId) throw new Error('Relatório não encontrado');
      const path = await uploadRelatorioFinalArquivo(obraId, file, file.name);
      const { error } = await supabase.from('relatorios_finais').update({ foto_capa_url: path }).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Capa atualizada'); invalidate(); },
    onError: (e) => toast.error(mensagemErro(e, 'Erro no upload')),
  });

  const uploadTemplateCapa = useMutation({
    mutationFn: async (file: File) => {
      if (!obraId || !relatorioId) throw new Error('Relatório não encontrado');
      const path = await uploadRelatorioFinalArquivo(obraId, file, file.name);
      const { error } = await supabase.from('relatorios_finais').update({ template_capa_url: path }).eq('id', relatorioId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Template da capa atualizado'); invalidate(); },
    onError: (e) => toast.error(mensagemErro(e, 'Erro no upload')),
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
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao remover template')),
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
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao enviar fotos')),
  });

  const renomearGrupoFotos = useMutation({
    mutationFn: async ({ antigoNome, novoNome }: { antigoNome: string; novoNome: string }) => {
      if (!relatorioId) throw new Error('Relatório não encontrado');
      const { error } = await supabase
        .from('relatorio_final_fotos')
        .update({ tipo: novoNome })
        .eq('relatorio_id', relatorioId)
        .eq('tipo', antigoNome);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: relatorioFinalKeys.fotos(relatorioId) });
      toast.success('Ambiente renomeado');
    },
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao renomear ambiente')),
  });

  const atualizarFoto = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; legenda?: string | null; ordem?: number; tipo?: TipoFoto; orientacao?: 'horizontal' | 'vertical'; rotacao?: number }) => {
      const { error } = await supabase.from('relatorio_final_fotos').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao atualizar foto')),
  });

  const excluirFoto = useMutation({
    mutationFn: async ({ id, fotoUrl }: { id: string; fotoUrl: string }) => {
      const { error } = await supabase.from('relatorio_final_fotos').delete().eq('id', id);
      if (error) throw error;
      const path = extractAnexoPath(fotoUrl);
      if (path) await supabase.storage.from('anexos').remove([path]);
    },
    onSuccess: () => { toast.success('Foto removida'); invalidate(); },
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao remover foto')),
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
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao assinar')),
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
    onError: (e) => toast.error(mensagemErro(e, 'Erro ao remover assinatura')),
  });

  return { criar, salvar, salvarAuto, salvarGruposFotos, uploadCapa, uploadTemplateCapa, removerTemplateCapa, adicionarFotos, renomearGrupoFotos, atualizarFoto, excluirFoto, assinar, removerAssinatura };
}
