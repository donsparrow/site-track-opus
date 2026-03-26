import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Sun, Cloud, CloudRain, Trash2, Upload, Users, Wrench, Package, AlertTriangle, Image as ImageIcon, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';

const climaIcons: Record<string, any> = { sol: Sun, nublado: Cloud, chuva: CloudRain };
const climaLabels: Record<string, string> = { sol: 'Sol', nublado: 'Nublado', chuva: 'Chuva' };

export default function DiarioObra() {
  const { canEdit, user } = useAuth();
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState('');
  const [diarios, setDiarios] = useState<any[]>([]);
  const [selectedDiario, setSelectedDiario] = useState<any>(null);
  const [diarioOpen, setDiarioOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // Inline add forms
  const [addingEquipe, setAddingEquipe] = useState(false);
  const [addingAtividade, setAddingAtividade] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingOcorrencia, setAddingOcorrencia] = useState(false);
  const [addingParalisacao, setAddingParalisacao] = useState(false);

  useEffect(() => {
    supabase.from('obras').select('id, nome').order('nome').then(({ data }) => setObras(data || []));
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
    if (selectedObra) fetchDiarios(selectedObra);
  }, [selectedObra]);

  const fetchDiarioDetails = async (diario: any) => {
    setSelectedDiario(diario);
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
    toast.success('Diário criado!');
    setDiarioOpen(false);
    fetchDiarios(selectedObra);
    if (data) fetchDiarioDetails(data);
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

  const addAtividadeItem = async (descricao: string, status: string) => {
    if (!selectedDiario) return;
    const { error } = await supabase.from('diario_atividades').insert({
      diario_id: selectedDiario.id, descricao, status
    });
    if (error) toast.error(error.message);
    else { toast.success('Adicionado!'); fetchDiarioDetails(selectedDiario); }
    setAddingAtividade(false);
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
                  <button
                    key={d.id}
                    onClick={() => fetchDiarioDetails(d)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedDiario?.id === d.id ? 'bg-accent/10 border-accent' : 'hover:bg-muted'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">{climaLabels[d.clima]}</Badge>
                    </div>
                    {d.horario_inicio && d.horario_fim && (
                      <p className="text-xs text-muted-foreground mt-1">{d.horario_inicio?.slice(0,5)} - {d.horario_fim?.slice(0,5)}</p>
                    )}
                  </button>
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
                            {atividades.map(a => (
                              <div key={a.id} className="flex items-center gap-2 p-2 rounded border">
                                <span className="flex-1 text-sm">{a.descricao}</span>
                                <Badge variant={a.status === 'executado' ? 'default' : a.status === 'andamento' ? 'secondary' : 'outline'}>
                                  {a.status === 'executado' ? 'Executado' : a.status === 'andamento' ? 'Andamento' : 'Não iniciado'}
                                </Badge>
                              </div>
                            ))}
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

function InlineAtividadeForm({ onSave, onCancel }: { onSave: (d: string, s: string) => void; onCancel: () => void }) {
  const [d, setD] = useState(''); const [s, setS] = useState('andamento');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded">
      <Input placeholder="Descrição" value={d} onChange={e => setD(e.target.value)} className="flex-1" />
      <Select value={s} onValueChange={setS}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="executado">Executado</SelectItem>
          <SelectItem value="andamento">Andamento</SelectItem>
          <SelectItem value="nao iniciado">Não iniciado</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" onClick={() => d && onSave(d, s)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
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
