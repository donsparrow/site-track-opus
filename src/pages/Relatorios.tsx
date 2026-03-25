import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function Relatorios() {
  const { canEdit } = useAuth();
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState('');
  const [atividades, setAtividades] = useState<any[]>([]);
  const [imagens, setImagens] = useState<any[]>([]);
  const [progressoGeral, setProgressoGeral] = useState(0);
  const [atividadeOpen, setAtividadeOpen] = useState(false);
  const [imagemOpen, setImagemOpen] = useState(false);

  // Atividade form
  const [atvNome, setAtvNome] = useState('');
  const [atvPercentual, setAtvPercentual] = useState('0');
  const [atvStatus, setAtvStatus] = useState('pendente');
  const [atvSaving, setAtvSaving] = useState(false);

  // Imagem form
  const [imgTipo, setImgTipo] = useState('durante');
  const [imgDescricao, setImgDescricao] = useState('');
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgSaving, setImgSaving] = useState(false);

  useEffect(() => {
    supabase.from('obras').select('id, nome').order('nome').then(({ data }) => setObras(data || []));
  }, []);

  const fetchObraData = async (obraId: string) => {
    const { data: atv } = await supabase.from('atividades_obra').select('*').eq('obra_id', obraId).order('created_at');
    const atvList = atv || [];
    setAtividades(atvList);
    const avg = atvList.length > 0 ? atvList.reduce((s, a) => s + a.percentual, 0) / atvList.length : 0;
    setProgressoGeral(Math.round(avg));

    const { data: imgs } = await supabase.from('imagens').select('*').eq('obra_id', obraId).order('created_at', { ascending: false });
    setImagens(imgs || []);
  };

  useEffect(() => {
    if (selectedObra) fetchObraData(selectedObra);
  }, [selectedObra]);

  const handleAddAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    setAtvSaving(true);
    const { error } = await supabase.from('atividades_obra').insert({
      obra_id: selectedObra,
      nome: atvNome,
      percentual: parseInt(atvPercentual),
      status: atvStatus,
    });
    setAtvSaving(false);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Atividade adicionada!');
      setAtvNome(''); setAtvPercentual('0'); setAtvStatus('pendente');
      setAtividadeOpen(false);
      fetchObraData(selectedObra);
    }
  };

  const updateAtividade = async (id: string, percentual: number, status: string) => {
    await supabase.from('atividades_obra').update({ percentual, status }).eq('id', id);
    fetchObraData(selectedObra);
  };

  const handleUploadImagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imgFile) return;
    setImgSaving(true);

    const ext = imgFile.name.split('.').pop();
    const filePath = `${selectedObra}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('anexos').upload(filePath, imgFile);

    if (uploadError) {
      toast.error('Erro no upload: ' + uploadError.message);
      setImgSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(filePath);

    const { error } = await supabase.from('imagens').insert({
      obra_id: selectedObra,
      tipo: imgTipo,
      url: urlData.publicUrl,
      descricao: imgDescricao || null,
    });
    setImgSaving(false);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Imagem enviada!');
      setImgFile(null); setImgDescricao(''); setImgTipo('durante');
      setImagemOpen(false);
      fetchObraData(selectedObra);
    }
  };

  const statusLabels: Record<string, string> = { pendente: 'Pendente', andamento: 'Em andamento', concluido: 'Concluído' };
  const tipoLabels: Record<string, string> = { antes: 'Antes', durante: 'Durante', depois: 'Depois' };

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">Relatórios</h1>

      <div className="mb-6 max-w-sm">
        <Select value={selectedObra} onValueChange={setSelectedObra}>
          <SelectTrigger><SelectValue placeholder="Selecione uma obra" /></SelectTrigger>
          <SelectContent>
            {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedObra && (
        <>
          {/* Progresso Geral */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display">Progresso Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={progressoGeral} className="flex-1" />
                <span className="text-lg font-display font-bold">{progressoGeral}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Atividades */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Atividades</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setAtividadeOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-1" /> Atividade
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {atividades.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-4">
                  {atividades.map(a => (
                    <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{a.nome}</span>
                          <Badge variant="secondary">{statusLabels[a.status] || a.status}</Badge>
                        </div>
                        {canEdit ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={a.percentual}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const newStatus = val === 100 ? 'concluido' : val > 0 ? 'andamento' : 'pendente';
                                updateAtividade(a.id, val, newStatus);
                              }}
                              className="flex-1 accent-accent"
                            />
                          </div>
                        ) : (
                          <Progress value={a.percentual} className="h-2" />
                        )}
                      </div>
                      <span className="text-sm font-display font-bold w-12 text-right">{a.percentual}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Imagens da Obra</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setImagemOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {imagens.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">Nenhuma imagem registrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imagens.map(img => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border">
                      <img src={img.url} alt={img.descricao || 'Imagem da obra'} className="w-full h-40 object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <Badge variant="secondary" className="text-xs">{tipoLabels[img.tipo] || img.tipo}</Badge>
                        {img.descricao && <p className="text-xs text-white mt-1 truncate">{img.descricao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Nova Atividade */}
      <Dialog open={atividadeOpen} onOpenChange={setAtividadeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Nova Atividade</DialogTitle></DialogHeader>
          <form onSubmit={handleAddAtividade} className="space-y-4">
            <div><Label>Nome *</Label><Input value={atvNome} onChange={e => setAtvNome(e.target.value)} required /></div>
            <div><Label>Percentual (%)</Label><Input type="number" min="0" max="100" value={atvPercentual} onChange={e => setAtvPercentual(e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={atvStatus} onValueChange={setAtvStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={atvSaving}>
              {atvSaving ? 'Salvando...' : 'Adicionar Atividade'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Upload Imagem */}
      <Dialog open={imagemOpen} onOpenChange={setImagemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Upload de Imagem</DialogTitle></DialogHeader>
          <form onSubmit={handleUploadImagem} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={imgTipo} onValueChange={setImgTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="antes">Antes</SelectItem>
                  <SelectItem value="durante">Durante</SelectItem>
                  <SelectItem value="depois">Depois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Imagem *</Label>
              <Input type="file" accept="image/*" onChange={e => setImgFile(e.target.files?.[0] || null)} required />
            </div>
            <div><Label>Descrição</Label><Textarea value={imgDescricao} onChange={e => setImgDescricao(e.target.value)} /></div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={imgSaving || !imgFile}>
              {imgSaving ? 'Enviando...' : 'Enviar Imagem'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
