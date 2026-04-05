import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Sun, Cloud, CloudRain, Trash2, Upload, Users, Wrench, Package, AlertTriangle, Image as ImageIcon, PauseCircle, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';

function percentualToStatus(p: number): string {
  if (p <= 0) return 'nao iniciado';
  if (p >= 100) return 'concluido';
  return 'andamento';
}

const climaIcons: Record<string, any> = { sol: Sun, nublado: Cloud, chuva: CloudRain };
const climaLabels: Record<string, string> = { sol: 'Sol', nublado: 'Nublado', chuva: 'Chuva' };

const statusLabels: Record<string, string> = {
  'concluido': 'Concluído',
  'andamento': 'Em andamento',
  'nao iniciado': 'Não iniciado',
  // legacy support
  'executado': 'Concluído',
};

function mapLegacyStatus(s: string) {
  return s === 'executado' ? 'concluido' : s;
}

export default function DiarioObra() {
  const { canEdit, isAdmin, isSuperAdmin, user } = useAuth();
  const { filterObras } = useObrasFiltered();
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState('');
  const [diarios, setDiarios] = useState<any[]>([]);
  const [selectedDiario, setSelectedDiario] = useState<any>(null);
  const [diarioOpen, setDiarioOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingDiario, setEditingDiario] = useState<any>(null);
  const [editDiarioOpen, setEditDiarioOpen] = useState(false);
  const [deleteDiarioId, setDeleteDiarioId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canEditDelete = isAdmin || isSuperAdmin;

  // New diario form
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    clima: 'sol',
    temperatura: '',
    horario_inicio: '07:00',
    horario_fim: '17:00',
    observacoes_gerais: '',
  });

  // Subtable items
  const [equipe, setEquipe] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [imagens, setImagens] = useState<any[]>([]);
  const [paralisacoes, setParalisacoes] = useState<any[]>([]);
  const [prazoContratual, setPrazoContratual] = useState<number>(0);

  // Inline add forms
  const [addingEquipe, setAddingEquipe] = useState(false);
  const [addingAtividade, setAddingAtividade] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingOcorrencia, setAddingOcorrencia] = useState(false);
  const [addingParalisacao, setAddingParalisacao] = useState(false);

  // Editing atividade
  const [editingAtividadeId, setEditingAtividadeId] = useState<string | null>(null);
  const [editAtivDesc, setEditAtivDesc] = useState('');
  const [editAtivStatus, setEditAtivStatus] = useState('');
  const [editAtivPercentual, setEditAtivPercentual] = useState(0);

  useEffect(() => {
    supabase.from('obras').select('id, nome, prazo_contratual_dias').order('nome').then(({ data }) => setObras(filterObras(data || [])));
  }, []);

  const fetchDiarios = async (obraId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', obraId)
      .order('data', { ascending: false });
    setDiarios(data || []);
    setSelectedDiario(null);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedObra) {
      fetchDiarios(selectedObra);
      const obra = obras.find(o => o.id === selectedObra);
      setPrazoContratual((obra as any)?.prazo_contratual_dias || 0);
    }
  }, [selectedObra]);

  const fetchDiarioDetails = async (diario: any) => {
    setSelectedDiario(diario);
    setEditingAtividadeId(null);
    const [e, a, m, o, i, p] = await Promise.all([
      supabase.from('diario_equipe').select('*').eq('diario_id', diario.id),
      supabase.from('diario_atividades').select('*').eq('diario_id', diario.id),
      supabase.from('diario_materiais').select('*').eq('diario_id', diario.id),
      supabase.from('diario_ocorrencias').select('*').eq('diario_id', diario.id),
      supabase.from('diario_imagens').select('*').eq('diario_id', diario.id),
      supabase.from('diario_paralisacoes').select('*').eq('diario_id', diario.id),
    ]);
    setEquipe(e.data || []);
    setAtividades(a.data || []);
    setMateriais(m.data || []);
    setOcorrencias(o.data || []);
    setImagens(i.data || []);
    setParalisacoes(p.data || []);
  };

  // Inherit data from last diary
  const inheritFromLastDiary = async (newDiarioId: string) => {
    // Find last diary for this obra (excluding the one just created)
    const { data: lastDiarios } = await supabase
      .from('diario_obra')
      .select('id')
      .eq('obra_id', selectedObra)
      .neq('id', newDiarioId)
      .order('data', { ascending: false })
      .limit(1);

    if (!lastDiarios || lastDiarios.length === 0) return;
    const lastId = lastDiarios[0].id;

    // Fetch equipe and atividades from last diary
    const [eqRes, atRes] = await Promise.all([
      supabase.from('diario_equipe').select('nome_funcionario, funcao, horas_trabalhadas').eq('diario_id', lastId),
      supabase.from('diario_atividades').select('descricao, status, percentual').eq('diario_id', lastId),
    ]);

    const lastEquipe = eqRes.data || [];
    const lastAtividades = atRes.data || [];

    // Copy equipe as new records
    if (lastEquipe.length > 0) {
      await supabase.from('diario_equipe').insert(
        lastEquipe.map(e => ({
          diario_id: newDiarioId,
          nome_funcionario: e.nome_funcionario,
          funcao: e.funcao,
          horas_trabalhadas: e.horas_trabalhadas,
        }))
      );
    }

    // Copy atividades as new records (map legacy status)
    if (lastAtividades.length > 0) {
      await supabase.from('diario_atividades').insert(
        lastAtividades.map(a => ({
          diario_id: newDiarioId,
          descricao: a.descricao,
          status: mapLegacyStatus(a.status),
          percentual: a.percentual || 0,
        }))
      );
    }
  };

  const handleCreateDiario = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error, data } = await supabase.from('diario_obra').insert({
      obra_id: selectedObra,
      ...formData,
      horario_inicio: formData.horario_inicio || null,
      horario_fim: formData.horario_fim || null,
      temperatura: formData.temperatura || null,
      observacoes_gerais: formData.observacoes_gerais || null,
    }).select().single();
    if (error) { toast.error('Erro: ' + error.message); return; }

    // Inherit from last diary
    if (data) {
      await inheritFromLastDiary(data.id);
    }

    toast.success('Diário criado com dados do último registro!');
    setDiarioOpen(false);
    fetchDiarios(selectedObra);
    if (data) fetchDiarioDetails(data);
  };

  const handleEditDiario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiario) return;
    const { error } = await supabase.from('diario_obra').update({
      data: editingDiario.data,
      clima: editingDiario.clima,
      temperatura: editingDiario.temperatura || null,
      horario_inicio: editingDiario.horario_inicio || null,
      horario_fim: editingDiario.horario_fim || null,
      observacoes_gerais: editingDiario.observacoes_gerais || null,
    }).eq('id', editingDiario.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Diário atualizado!');
    setEditDiarioOpen(false);
    setEditingDiario(null);
    fetchDiarios(selectedObra);
    if (selectedDiario?.id === editingDiario.id) {
      fetchDiarioDetails({ ...selectedDiario, ...editingDiario });
    }
  };

  const handleDeleteDiario = async () => {
    if (!deleteDiarioId) return;
    await Promise.all([
      supabase.from('diario_equipe').delete().eq('diario_id', deleteDiarioId),
      supabase.from('diario_atividades').delete().eq('diario_id', deleteDiarioId),
      supabase.from('diario_materiais').delete().eq('diario_id', deleteDiarioId),
      supabase.from('diario_ocorrencias').delete().eq('diario_id', deleteDiarioId),
      supabase.from('diario_imagens').delete().eq('diario_id', deleteDiarioId),
      supabase.from('diario_paralisacoes').delete().eq('diario_id', deleteDiarioId),
    ]);
    const { error } = await supabase.from('diario_obra').delete().eq('id', deleteDiarioId);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Diário excluído!');
    setDeleteDialogOpen(false);
    setDeleteDiarioId(null);
    if (selectedDiario?.id === deleteDiarioId) setSelectedDiario(null);
    fetchDiarios(selectedObra);
  };

  const addEquipeItem = async (nome: string, funcao: string, horas: string) => {
    if (!selectedDiario) return;
    const { error } = await supabase.from('diario_equipe').insert({
      diario_id: selectedDiario.id, nome_funcionario: nome, funcao: funcao || null, horas_trabalhadas: parseFloat(horas) || 0
    });
    if (error) toast.error(error.message);
    else { toast.success('Adicionado!'); fetchDiarioDetails(selectedDiario); }
    setAddingEquipe(false);
  };

  const addAtividadeItem = async (descricao: string, status: string, percentual: number) => {
    if (!selectedDiario) return;
    const finalStatus = percentualToStatus(percentual);
    const { error } = await supabase.from('diario_atividades').insert({
      diario_id: selectedDiario.id, descricao, status: finalStatus, percentual
    });
    if (error) toast.error(error.message);
    else { toast.success('Adicionado!'); fetchDiarioDetails(selectedDiario); }
    setAddingAtividade(false);
  };

  const updateAtividadeItem = async (id: string) => {
    const finalStatus = percentualToStatus(editAtivPercentual);
    const { error } = await supabase.from('diario_atividades')
      .update({ descricao: editAtivDesc, status: finalStatus, percentual: editAtivPercentual })
      .eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Atividade atualizada!'); setEditingAtividadeId(null); fetchDiarioDetails(selectedDiario); }
  };

  const deleteAtividadeItem = async (id: string) => {
    const { error } = await supabase.from('diario_atividades').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Atividade removida!'); fetchDiarioDetails(selectedDiario); }
  };

  const addMaterialItem = async (material: string, qtd: string, unidade: string) => {
    if (!selectedDiario) return;
    const { error } = await supabase.from('diario_materiais').insert({
      diario_id: selectedDiario.id, material, quantidade: parseFloat(qtd) || 0, unidade
    });
    if (error) toast.error(error.message);
    else { toast.success('Adicionado!'); fetchDiarioDetails(selectedDiario); }
    setAddingMaterial(false);
  };

  const addOcorrenciaItem = async (descricao: string, impacto: string) => {
    if (!selectedDiario) return;
    const { error } = await supabase.from('diario_ocorrencias').insert({
      diario_id: selectedDiario.id, descricao, impacto
    });
    if (error) toast.error(error.message);
    else { toast.success('Adicionado!'); fetchDiarioDetails(selectedDiario); }
    setAddingOcorrencia(false);
  };

  const addParalisacaoItem = async (motivo: string, dataInicio: string, dataFim: string) => {
    if (!selectedDiario) return;
    const dias = dataFim ? Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / 86400000) : 0;
    const { error } = await supabase.from('diario_paralisacoes').insert({
      diario_id: selectedDiario.id, motivo, data_inicio: dataInicio, data_fim: dataFim || null, total_dias: dias
    });
    if (error) toast.error(error.message);
    else { toast.success('Adicionado!'); fetchDiarioDetails(selectedDiario); }
    setAddingParalisacao(false);
  };

  const handleUploadImagem = async (file: File, descricao: string) => {
    if (!selectedDiario) return;
    const ext = file.name.split('.').pop();
    const filePath = `diarios/${selectedDiario.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('anexos').upload(filePath, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(filePath);
    const { error } = await supabase.from('diario_imagens').insert({
      diario_id: selectedDiario.id, url: urlData.publicUrl, descricao: descricao || null
    });
    if (error) toast.error(error.message);
    else { toast.success('Imagem enviada!'); fetchDiarioDetails(selectedDiario); }
  };

  const ClimaIcon = selectedDiario ? climaIcons[selectedDiario.clima] || Sun : Sun;

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">Diário de Obra</h1>

      <div className="flex gap-4 mb-6">
        <div className="max-w-sm flex-1">
          <Select value={selectedObra} onValueChange={setSelectedObra}>
            <SelectTrigger><SelectValue placeholder="Selecione uma obra" /></SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedObra && canEdit && (
          <Button onClick={() => setDiarioOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> Novo Diário
          </Button>
        )}
      </div>

      {selectedObra && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap text-sm font-medium">Prazo Contratual (dias úteis):</Label>
              <Input
                type="number"
                min={1}
                className="w-32"
                value={prazoContratual || ''}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setPrazoContratual(val >= 1 ? val : 0);
                }}
                onBlur={async () => {
                  if (prazoContratual >= 1 && selectedObra) {
                    console.log('[PRAZO] Salvando prazo_contratual_dias:', prazoContratual, 'para obra:', selectedObra);
                    const { error } = await supabase
                      .from('obras')
                      .update({ prazo_contratual_dias: prazoContratual })
                      .eq('id', selectedObra);
                    if (error) {
                      console.error('[PRAZO] Erro ao salvar:', error);
                      toast.error('Erro ao salvar prazo: ' + error.message);
                    } else {
                      const { data: verify } = await supabase.from('obras').select('prazo_contratual_dias').eq('id', selectedObra).single();
                      console.log('[PRAZO] Valor no banco após salvar:', verify?.prazo_contratual_dias);
                      toast.success('Prazo contratual atualizado: ' + prazoContratual + ' dias');
                    }
                  }
                }}
                placeholder="Dias"
              />
              <span className="text-xs text-muted-foreground">{prazoContratual > 0 ? `${prazoContratual} dias` : 'Não definido'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedObra && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: list */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">REGISTROS</h3>
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full" /></div>
            ) : diarios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum diário registrado</p>
            ) : (
              diarios.map(d => {
                const Icon = climaIcons[d.clima] || Sun;
                return (
                  <div
                    key={d.id}
                    onClick={() => fetchDiarioDetails(d)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${selectedDiario?.id === d.id ? 'bg-accent/10 border-accent' : 'hover:bg-muted'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">{climaLabels[d.clima]}</Badge>
                    </div>
                    {d.horario_inicio && d.horario_fim && (
                      <p className="text-xs text-muted-foreground mt-1">{d.horario_inicio?.slice(0,5)} - {d.horario_fim?.slice(0,5)}</p>
                    )}
                    {canEditDelete && (
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => {
                          e.stopPropagation();
                          setEditingDiario({ ...d });
                          setEditDiarioOpen(true);
                        }}>
                          <Pencil className="h-3 w-3 mr-1" />Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDiarioId(d.id);
                          setDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="h-3 w-3 mr-1" />Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right: detail */}
          <div className="lg:col-span-2">
            {selectedDiario ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <ClimaIcon className="h-6 w-6 text-accent" />
                      <div>
                        <CardTitle className="font-display">{new Date(selectedDiario.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {selectedDiario.horario_inicio?.slice(0,5)} - {selectedDiario.horario_fim?.slice(0,5)}
                          {selectedDiario.temperatura && ` · ${selectedDiario.temperatura}`}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  {selectedDiario.observacoes_gerais && (
                    <CardContent className="pt-0">
                      <p className="text-sm">{selectedDiario.observacoes_gerais}</p>
                    </CardContent>
                  )}
                </Card>

                <Tabs defaultValue="equipe">
                  <TabsList className="grid grid-cols-6 w-full">
                    <TabsTrigger value="equipe" className="text-xs"><Users className="h-3 w-3 mr-1" />Equipe</TabsTrigger>
                    <TabsTrigger value="atividades" className="text-xs"><Wrench className="h-3 w-3 mr-1" />Atividades</TabsTrigger>
                    <TabsTrigger value="materiais" className="text-xs"><Package className="h-3 w-3 mr-1" />Materiais</TabsTrigger>
                    <TabsTrigger value="ocorrencias" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Ocorrências</TabsTrigger>
                    <TabsTrigger value="imagens" className="text-xs"><ImageIcon className="h-3 w-3 mr-1" />Imagens</TabsTrigger>
                    <TabsTrigger value="paralisacoes" className="text-xs"><PauseCircle className="h-3 w-3 mr-1" />Paral.</TabsTrigger>
                  </TabsList>

                  {/* EQUIPE */}
                  <TabsContent value="equipe">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm font-display">Equipe</CardTitle>
                        {canEdit && <Button size="sm" variant="outline" onClick={() => setAddingEquipe(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
                      </CardHeader>
                      <CardContent>
                        {addingEquipe && <InlineEquipeForm onSave={addEquipeItem} onCancel={() => setAddingEquipe(false)} />}
                        {equipe.length === 0 && !addingEquipe ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p> : (
                          <Table>
                            <TableHeader><TableRow><TableHead>Funcionário</TableHead><TableHead>Função</TableHead><TableHead>Horas</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {equipe.map(e => (
                                <TableRow key={e.id}><TableCell>{e.nome_funcionario}</TableCell><TableCell>{e.funcao || '—'}</TableCell><TableCell>{e.horas_trabalhadas}h</TableCell></TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ATIVIDADES */}
                  <TabsContent value="atividades">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm font-display">Atividades</CardTitle>
                        {canEdit && <Button size="sm" variant="outline" onClick={() => setAddingAtividade(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
                      </CardHeader>
                      <CardContent>
                        {addingAtividade && <InlineAtividadeForm onSave={addAtividadeItem} onCancel={() => setAddingAtividade(false)} />}
                        {atividades.length === 0 && !addingAtividade ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p> : (
                          <div className="space-y-2">
                            {atividades.map(a => {
                              const normalizedStatus = mapLegacyStatus(a.status);
                              const isEditing = editingAtividadeId === a.id;

                              if (isEditing) {
                                const editAutoStatus = percentualToStatus(editAtivPercentual);
                                return (
                                  <div key={a.id} className="flex flex-col gap-2 p-3 rounded border border-accent bg-accent/5">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={editAtivDesc}
                                        onChange={e => setEditAtivDesc(e.target.value)}
                                        className="flex-1"
                                      />
                                      <Badge variant={editAutoStatus === 'concluido' ? 'default' : editAutoStatus === 'andamento' ? 'secondary' : 'outline'}>
                                        {statusLabels[editAutoStatus]}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground w-8">{editAtivPercentual}%</span>
                                      <Slider value={[editAtivPercentual]} onValueChange={v => setEditAtivPercentual(v[0])} min={0} max={100} step={5} className="flex-1" />
                                      <Button size="sm" variant="ghost" onClick={() => updateAtividadeItem(a.id)}>
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingAtividadeId(null)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={a.id} className="flex flex-col gap-1 p-2 rounded border">
                                  <div className="flex items-center gap-2">
                                    <span className="flex-1 text-sm">{a.descricao}</span>
                                    <span className="text-xs font-medium text-muted-foreground">{a.percentual || 0}%</span>
                                    <Badge variant={normalizedStatus === 'concluido' ? 'default' : normalizedStatus === 'andamento' ? 'secondary' : 'outline'}>
                                      {statusLabels[normalizedStatus] || normalizedStatus}
                                    </Badge>
                                    {canEdit && (
                                      <>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                          setEditingAtividadeId(a.id);
                                          setEditAtivDesc(a.descricao);
                                          setEditAtivStatus(normalizedStatus);
                                          setEditAtivPercentual(a.percentual || 0);
                                        }}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAtividadeItem(a.id)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                  <Progress value={a.percentual || 0} className="h-2" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* MATERIAIS */}
                  <TabsContent value="materiais">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm font-display">Materiais</CardTitle>
                        {canEdit && <Button size="sm" variant="outline" onClick={() => setAddingMaterial(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
                      </CardHeader>
                      <CardContent>
                        {addingMaterial && <InlineMaterialForm onSave={addMaterialItem} onCancel={() => setAddingMaterial(false)} />}
                        {materiais.length === 0 && !addingMaterial ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p> : (
                          <Table>
                            <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Qtd</TableHead><TableHead>Unidade</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {materiais.map(m => (
                                <TableRow key={m.id}><TableCell>{m.material}</TableCell><TableCell>{m.quantidade}</TableCell><TableCell>{m.unidade}</TableCell></TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* OCORRÊNCIAS */}
                  <TabsContent value="ocorrencias">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm font-display">Ocorrências</CardTitle>
                        {canEdit && <Button size="sm" variant="outline" onClick={() => setAddingOcorrencia(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
                      </CardHeader>
                      <CardContent>
                        {addingOcorrencia && <InlineOcorrenciaForm onSave={addOcorrenciaItem} onCancel={() => setAddingOcorrencia(false)} />}
                        {ocorrencias.length === 0 && !addingOcorrencia ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p> : (
                          <div className="space-y-2">
                            {ocorrencias.map(o => (
                              <div key={o.id} className="flex items-center gap-2 p-2 rounded border">
                                <span className="flex-1 text-sm">{o.descricao}</span>
                                <Badge variant={o.impacto === 'alto' ? 'destructive' : o.impacto === 'medio' ? 'secondary' : 'outline'}>
                                  {o.impacto}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* IMAGENS */}
                  <TabsContent value="imagens">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm font-display">Imagens</CardTitle>
                        {canEdit && <ImageUploadButton onUpload={handleUploadImagem} />}
                      </CardHeader>
                      <CardContent>
                        {imagens.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma imagem</p> : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {imagens.map(img => (
                              <div key={img.id} className="relative rounded-lg overflow-hidden border">
                                <img src={img.url} alt={img.descricao || ''} className="w-full h-32 object-cover" />
                                {img.descricao && <p className="text-xs p-1 truncate">{img.descricao}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* PARALISAÇÕES */}
                  <TabsContent value="paralisacoes">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm font-display">Paralisações</CardTitle>
                        {canEdit && <Button size="sm" variant="outline" onClick={() => setAddingParalisacao(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
                      </CardHeader>
                      <CardContent>
                        {addingParalisacao && <InlineParalisacaoForm onSave={addParalisacaoItem} onCancel={() => setAddingParalisacao(false)} />}
                        {paralisacoes.length === 0 && !addingParalisacao ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p> : (
                          <Table>
                            <TableHeader><TableRow><TableHead>Motivo</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Dias</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {paralisacoes.map(p => (
                                <TableRow key={p.id}>
                                  <TableCell>{p.motivo}</TableCell>
                                  <TableCell>{new Date(p.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                                  <TableCell>{p.data_fim ? new Date(p.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                                  <TableCell>{p.total_dias}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Sun className="h-12 w-12 mb-4" />
                <p>Selecione um diário para ver os detalhes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog Novo Diário */}
      <Dialog open={diarioOpen} onOpenChange={setDiarioOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Novo Diário de Obra</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateDiario} className="space-y-4">
            <div><Label>Data *</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} required /></div>
            <div>
              <Label>Clima</Label>
              <Select value={formData.clima} onValueChange={v => setFormData({ ...formData, clima: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sol">☀️ Sol</SelectItem>
                  <SelectItem value="nublado">☁️ Nublado</SelectItem>
                  <SelectItem value="chuva">🌧️ Chuva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Temperatura</Label><Input placeholder="Ex: 28°C" value={formData.temperatura} onChange={e => setFormData({ ...formData, temperatura: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Horário Início</Label><Input type="time" value={formData.horario_inicio} onChange={e => setFormData({ ...formData, horario_inicio: e.target.value })} /></div>
              <div><Label>Horário Fim</Label><Input type="time" value={formData.horario_fim} onChange={e => setFormData({ ...formData, horario_fim: e.target.value })} /></div>
            </div>
            <div><Label>Observações Gerais</Label><Textarea value={formData.observacoes_gerais} onChange={e => setFormData({ ...formData, observacoes_gerais: e.target.value })} /></div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Criar Diário</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Diário */}
      <Dialog open={editDiarioOpen} onOpenChange={setEditDiarioOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar Diário de Obra</DialogTitle>
            <DialogDescription>Altere os dados do diário e clique em salvar.</DialogDescription>
          </DialogHeader>
          {editingDiario && (
            <form onSubmit={handleEditDiario} className="space-y-4">
              <div><Label>Data *</Label><Input type="date" value={editingDiario.data} onChange={e => setEditingDiario({ ...editingDiario, data: e.target.value })} required /></div>
              <div>
                <Label>Clima</Label>
                <Select value={editingDiario.clima} onValueChange={v => setEditingDiario({ ...editingDiario, clima: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sol">☀️ Sol</SelectItem>
                    <SelectItem value="nublado">☁️ Nublado</SelectItem>
                    <SelectItem value="chuva">🌧️ Chuva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Temperatura</Label><Input placeholder="Ex: 28°C" value={editingDiario.temperatura || ''} onChange={e => setEditingDiario({ ...editingDiario, temperatura: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Horário Início</Label><Input type="time" value={editingDiario.horario_inicio || ''} onChange={e => setEditingDiario({ ...editingDiario, horario_inicio: e.target.value })} /></div>
                <div><Label>Horário Fim</Label><Input type="time" value={editingDiario.horario_fim || ''} onChange={e => setEditingDiario({ ...editingDiario, horario_fim: e.target.value })} /></div>
              </div>
              <div><Label>Observações Gerais</Label><Textarea value={editingDiario.observacoes_gerais || ''} onChange={e => setEditingDiario({ ...editingDiario, observacoes_gerais: e.target.value })} /></div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir diário de obra?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este diário? Todos os dados relacionados (equipe, atividades, materiais, ocorrências, imagens e paralisações) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDiario} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Inline forms
function InlineEquipeForm({ onSave, onCancel }: { onSave: (n: string, f: string, h: string) => void; onCancel: () => void }) {
  const [n, setN] = useState(''); const [f, setF] = useState(''); const [h, setH] = useState('8');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded">
      <Input placeholder="Nome" value={n} onChange={e => setN(e.target.value)} className="flex-1" />
      <Input placeholder="Função" value={f} onChange={e => setF(e.target.value)} className="w-28" />
      <Input type="number" placeholder="Horas" value={h} onChange={e => setH(e.target.value)} className="w-20" />
      <Button size="sm" onClick={() => n && onSave(n, f, h)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}

function InlineAtividadeForm({ onSave, onCancel }: { onSave: (d: string, s: string, p: number) => void; onCancel: () => void }) {
  const [d, setD] = useState(''); const [p, setP] = useState(0);
  const autoStatus = percentualToStatus(p);
  return (
    <div className="flex flex-col gap-2 mb-3 p-3 bg-muted rounded">
      <div className="flex gap-2">
        <Input placeholder="Descrição" value={d} onChange={e => setD(e.target.value)} className="flex-1" />
        <Badge variant={autoStatus === 'concluido' ? 'default' : autoStatus === 'andamento' ? 'secondary' : 'outline'}>
          {statusLabels[autoStatus]}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-8">{p}%</span>
        <Slider value={[p]} onValueChange={v => setP(v[0])} min={0} max={100} step={5} className="flex-1" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" onClick={() => d && onSave(d, autoStatus, p)}>OK</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
      </div>
    </div>
  );
}

function InlineMaterialForm({ onSave, onCancel }: { onSave: (m: string, q: string, u: string) => void; onCancel: () => void }) {
  const [m, setM] = useState(''); const [q, setQ] = useState('1'); const [u, setU] = useState('un');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded">
      <Input placeholder="Material" value={m} onChange={e => setM(e.target.value)} className="flex-1" />
      <Input type="number" placeholder="Qtd" value={q} onChange={e => setQ(e.target.value)} className="w-20" />
      <Input placeholder="Un" value={u} onChange={e => setU(e.target.value)} className="w-16" />
      <Button size="sm" onClick={() => m && onSave(m, q, u)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}

function InlineOcorrenciaForm({ onSave, onCancel }: { onSave: (d: string, i: string) => void; onCancel: () => void }) {
  const [d, setD] = useState(''); const [i, setI] = useState('baixo');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded">
      <Input placeholder="Descrição" value={d} onChange={e => setD(e.target.value)} className="flex-1" />
      <Select value={i} onValueChange={setI}>
        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="baixo">Baixo</SelectItem>
          <SelectItem value="medio">Médio</SelectItem>
          <SelectItem value="alto">Alto</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" onClick={() => d && onSave(d, i)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}

function InlineParalisacaoForm({ onSave, onCancel }: { onSave: (m: string, di: string, df: string) => void; onCancel: () => void }) {
  const [m, setM] = useState(''); const [di, setDi] = useState(new Date().toISOString().split('T')[0]); const [df, setDf] = useState('');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded flex-wrap">
      <Input placeholder="Motivo" value={m} onChange={e => setM(e.target.value)} className="flex-1 min-w-[150px]" />
      <Input type="date" value={di} onChange={e => setDi(e.target.value)} className="w-36" />
      <Input type="date" value={df} onChange={e => setDf(e.target.value)} className="w-36" placeholder="Fim (opcional)" />
      <Button size="sm" onClick={() => m && onSave(m, di, df)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}

function ImageUploadButton({ onUpload }: { onUpload: (f: File, d: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0];
        if (f) onUpload(f, '');
      }} />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="h-3 w-3 mr-1" />Upload</Button>
    </>
  );
}
