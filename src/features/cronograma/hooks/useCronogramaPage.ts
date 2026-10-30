import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCronogramaScope } from './useCronogramaScope';
import { useObrasCronograma } from './useObrasCronograma';
import { useCronograma } from './useCronograma';
import { useCronogramaAtividades } from './useCronogramaAtividades';
import { useAditivos } from './useAditivos';
import { useObraPrazoInfo } from './useObraPrazoInfo';
import { useEmpresaConfigCronograma } from './useEmpresaConfigCronograma';
import { useCronogramaMutations } from './useCronogramaMutations';
import { calcularIndicadores, calcularGanttData } from '../utils';
import { exportarCronogramaPdf } from '../pdf';
import type { Aditivo, Atividade, AtividadeFormData, AditivoFormData } from '../types';
import { supabase } from '@/integrations/supabase/client';

const EMPTY_ATIVIDADE: AtividadeFormData = {
  nome_atividade: '', descricao: '', data_inicio: '', data_fim: '',
  percentual_concluido: 0, status: 'nao_iniciado', peso: 0, tipo_atividade: 'original', observacoes: '',
};
const EMPTY_ADITIVO: AditivoFormData = {
  descricao: '', dias_adicionais: '', data_aprovacao: '', justificativa: '', responsavel_aprovacao: '', documento_url: '',
  atividades: [],
};

/** Orquestra estado de UI + hooks de dados do módulo Cronograma. */
export function useCronogramaPage() {
  const { canEdit, isAdmin, isSuperAdmin } = useCronogramaScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const obraIdParam = searchParams.get('obra');
  const [obraId, setObraId] = useState(obraIdParam || '');

  useEffect(() => {
    if (obraIdParam && obraIdParam !== obraId) setObraId(obraIdParam);
  }, [obraIdParam]);

  const { obras } = useObrasCronograma();
  const { cronograma } = useCronograma(obraId, canEdit);
  const atividadesQuery = useCronogramaAtividades(cronograma?.id ?? null);
  const atividades = atividadesQuery.atividades;
  const { aditivos } = useAditivos(obraId);
  const { prazoContratual, primeiroDiario, ultimoDiario, obraStatus, dataFimPrevista, paralisacoes, datasDiarios } = useObraPrazoInfo(obraId);
  const empresaConfigQuery = useEmpresaConfigCronograma();
  const mutations = useCronogramaMutations(obraId, cronograma?.id ?? null);

  const obraNome = obras.find(o => o.id === obraId)?.nome || '';
  const canEditPeso = isAdmin || isSuperAdmin;
  const indicadores = calcularIndicadores({
    atividades, aditivos, prazoContratual, primeiroDiario, obraStatus, ultimoDiario, dataFimPrevista,
    paralisacoes, datasDiarios,
  });
  const ganttData = calcularGanttData(atividades);

  // Diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [formData, setFormData] = useState<AtividadeFormData>(EMPTY_ATIVIDADE);
  const [aditivoDialogOpen, setAditivoDialogOpen] = useState(false);
  const [aditivoForm, setAditivoForm] = useState<AditivoFormData>(EMPTY_ADITIVO);
  const [editingAditivo, setEditingAditivo] = useState<Aditivo | null>(null);
  const [loadingAditivo, setLoadingAditivo] = useState(false);
  const [deleteAditivoId, setDeleteAditivoId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const selecionarObra = (id: string) => { setObraId(id); setSearchParams({ obra: id }); };

  const openNew = (tipo: 'original' | 'aditivo' = 'original') => {
    setEditingAtividade(null);
    const sugPeso = tipo === 'aditivo'
      ? 0
      : (atividades.length === 0 ? 100 : Math.max(0, 100 - atividades.reduce((s, a) => s + (a.peso || 0), 0)));
    setFormData({ ...EMPTY_ATIVIDADE, peso: sugPeso, tipo_atividade: tipo });
    setDialogOpen(true);
  };

  const openEdit = (a: Atividade) => {
    setEditingAtividade(a);
    setFormData({
      nome_atividade: a.nome_atividade,
      descricao: a.descricao || '',
      data_inicio: a.data_inicio || '',
      data_fim: a.data_fim || '',
      percentual_concluido: a.percentual_concluido,
      status: a.status,
      peso: a.peso || 0,
      tipo_atividade: a.tipo_atividade || 'original',
      observacoes: a.observacoes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome_atividade || !cronograma) return;
    // Validação peso: somente atividades originais (aditivos somam fora do 100%)
    const otherOriginalPeso = atividades
      .filter(a => (a.tipo_atividade || 'original') === 'original')
      .filter(a => !editingAtividade || a.id !== editingAtividade.id)
      .reduce((s, a) => s + (a.peso || 0), 0);
    if (formData.tipo_atividade === 'original' && otherOriginalPeso + formData.peso > 100) {
      toast.error(`Soma dos pesos do escopo original excede 100% (${otherOriginalPeso + formData.peso}%). Ajuste o peso.`);
      return;
    }
    const maxOrdem = atividades.length > 0 ? Math.max(...atividades.map(a => a.ordem)) : 0;
    mutations.salvarAtividade.mutate({
      id: editingAtividade?.id,
      cronogramaId: cronograma.id,
      maxOrdem,
      values: {
        nome_atividade: formData.nome_atividade,
        descricao: formData.descricao || null,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        percentual_concluido: formData.percentual_concluido,
        status: formData.status,
        peso: formData.peso,
        tipo_atividade: editingAtividade?.aditivo_id ? 'aditivo' : formData.tipo_atividade,
        observacoes: formData.observacoes || null,
      },
    });
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    mutations.excluirAtividade.mutate(deleteId);
    setDeleteId(null);
  };

  const handleSaveAditivo = () => {
    if (!aditivoForm.descricao || !obraId) { toast.error('Informe a descrição do aditivo'); return; }
    if (aditivoForm.dias_adicionais === '' || Number(aditivoForm.dias_adicionais) < 1) { toast.error('Informe os dias adicionais do aditivo (mínimo 1 dia útil).'); return; }
    const linhas = (aditivoForm.atividades ?? []).filter(a => a.nome_atividade.trim());
    if (linhas.length !== (aditivoForm.atividades ?? []).length) {
      toast.error('Informe o nome de todas as atividades do aditivo (ou remova as linhas vazias)');
      return;
    }
    const input = {
      payload: {
        obra_id: obraId,
        descricao: aditivoForm.descricao,
        dias_adicionais: Number(aditivoForm.dias_adicionais) || 0,
        data_aprovacao: aditivoForm.data_aprovacao || null,
        justificativa: aditivoForm.justificativa || null,
        responsavel_aprovacao: aditivoForm.responsavel_aprovacao || null,
        documento_url: aditivoForm.documento_url || null,
      },
      atividades: linhas.map(a => ({
        id: a.id,
        nome_atividade: a.nome_atividade.trim(),
        peso: Math.max(0, Number(a.peso) || 0),
        data_inicio: a.data_inicio || null,
        data_fim: a.data_fim || null,
      })),
    };
    const callbacks = { onSuccess: () => setAditivoDialogOpen(false) };
    if (editingAditivo) {
      mutations.editarAditivo.mutate({ id: editingAditivo.id, ...input }, callbacks);
    } else {
      mutations.criarAditivo.mutate(input, callbacks);
    }
  };

  const handleDeleteAditivo = () => {
    if (!deleteAditivoId) return;
    mutations.excluirAditivo.mutate(deleteAditivoId);
    setDeleteAditivoId(null);
  };

  const moveAtividade = (id: string, direction: 'up' | 'down') => {
    const idx = atividades.findIndex(a => a.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === atividades.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    mutations.moverAtividade.mutate({
      current: { id: atividades[idx].id, ordem: atividades[idx].ordem },
      swap: { id: atividades[swapIdx].id, ordem: atividades[swapIdx].ordem },
    });
  };

  const exportPDF = async () => {
    const { data: empresaConfig } = await empresaConfigQuery.refetch();
    await exportarCronogramaPdf({
      empresaConfig: empresaConfig ?? null,
      obraNome,
      atividades,
      progressoGeral: indicadores.progressoGeral,
      ganttData,
    });
    toast.success('PDF exportado com sucesso');
  };

  const openNewAditivo = () => { setEditingAditivo(null); setAditivoForm(EMPTY_ADITIVO); setAditivoDialogOpen(true); };

  const openEditAditivo = async (aditivo: Aditivo) => {
    setLoadingAditivo(true);
    try {
      const { data, error } = await supabase.from('cronograma_atividades')
        .select('*').eq('aditivo_id', aditivo.id).order('ordem');
      if (error) throw error;
      setEditingAditivo(aditivo);
      setAditivoForm({
        descricao: aditivo.descricao, dias_adicionais: aditivo.dias_adicionais,
        data_aprovacao: aditivo.data_aprovacao || '', justificativa: aditivo.justificativa || '',
        responsavel_aprovacao: aditivo.responsavel_aprovacao || '', documento_url: aditivo.documento_url || '',
        atividades: (data ?? []).map(a => ({ id: a.id, nome_atividade: a.nome_atividade,
          peso: a.peso, data_inicio: a.data_inicio || '', data_fim: a.data_fim || '' })),
      });
      setAditivoDialogOpen(true);
    } catch (error) {
      toast.error('Não foi possível carregar o aditivo: ' + (error instanceof Error ? error.message : 'tente novamente'));
    } finally { setLoadingAditivo(false); }
  };

  return {
    canEdit, canEditPeso, obras, obraId, obraNome, selecionarObra,
    cronograma, atividades, atividadesQuery, aditivos, indicadores, ganttData,
    dialogOpen, setDialogOpen, editingAtividade, formData, setFormData,
    aditivoDialogOpen, setAditivoDialogOpen, aditivoForm, setAditivoForm,
    deleteId, setDeleteId, deleteAditivoId, setDeleteAditivoId,
    importOpen, setImportOpen,
    openNew, openEdit, openNewAditivo, openEditAditivo, editingAditivo, loadingAditivo,
    savingAditivo: mutations.criarAditivo.isPending || mutations.editarAditivo.isPending,
    handleSave, handleDelete,
    obraStatus,
    handleSaveAditivo, handleDeleteAditivo, moveAtividade, exportPDF,
  };
}
