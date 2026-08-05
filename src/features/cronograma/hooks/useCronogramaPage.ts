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
import type { Atividade, AtividadeFormData, AditivoFormData } from '../types';

const EMPTY_ATIVIDADE: AtividadeFormData = {
  nome_atividade: '', descricao: '', data_inicio: '', data_fim: '',
  percentual_concluido: 0, status: 'nao_iniciado', peso: 0, tipo_atividade: 'original', observacoes: '',
};
const EMPTY_ADITIVO: AditivoFormData = {
  descricao: '', dias_adicionais: 0, data_aprovacao: '', justificativa: '', responsavel_aprovacao: '', documento_url: '',
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
  const { prazoContratual, primeiroDiario } = useObraPrazoInfo(obraId);
  const empresaConfigQuery = useEmpresaConfigCronograma();
  const mutations = useCronogramaMutations(obraId, cronograma?.id ?? null);

  const obraNome = obras.find(o => o.id === obraId)?.nome || '';
  const canEditPeso = isAdmin || isSuperAdmin;
  const indicadores = calcularIndicadores(atividades, aditivos, prazoContratual, primeiroDiario);
  const ganttData = calcularGanttData(atividades);

  // Diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [formData, setFormData] = useState<AtividadeFormData>(EMPTY_ATIVIDADE);
  const [aditivoDialogOpen, setAditivoDialogOpen] = useState(false);
  const [aditivoForm, setAditivoForm] = useState<AditivoFormData>(EMPTY_ADITIVO);
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
        tipo_atividade: formData.tipo_atividade,
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
    mutations.criarAditivo.mutate({
      obra_id: obraId,
      descricao: aditivoForm.descricao,
      dias_adicionais: aditivoForm.dias_adicionais || 0,
      data_aprovacao: aditivoForm.data_aprovacao || null,
      justificativa: aditivoForm.justificativa || null,
      responsavel_aprovacao: aditivoForm.responsavel_aprovacao || null,
      documento_url: aditivoForm.documento_url || null,
    });
    setAditivoDialogOpen(false);
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

  const openNewAditivo = () => { setAditivoForm(EMPTY_ADITIVO); setAditivoDialogOpen(true); };

  return {
    canEdit, canEditPeso, obras, obraId, obraNome, selecionarObra,
    cronograma, atividades, atividadesQuery, aditivos, indicadores, ganttData,
    dialogOpen, setDialogOpen, editingAtividade, formData, setFormData,
    aditivoDialogOpen, setAditivoDialogOpen, aditivoForm, setAditivoForm,
    deleteId, setDeleteId, deleteAditivoId, setDeleteAditivoId,
    importOpen, setImportOpen,
    openNew, openEdit, openNewAditivo, handleSave, handleDelete,
    handleSaveAditivo, handleDeleteAditivo, moveAtividade, exportPDF,
  };
}
