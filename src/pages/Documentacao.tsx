import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FolderPlus, Upload, Trash2, Eye, Folder, FileText, Image, X, Pencil, Download } from 'lucide-react';

type Pasta = { id: string; obra_id: string; nome_pasta: string; created_at: string };
type Arquivo = { id: string; pasta_id: string; nome_arquivo: string; tipo: string; url_arquivo: string; tamanho: number; created_at: string };

export default function Documentacao() {
  const { role, isAdmin } = useAuth();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  const canManage = role === 'admin' || role === 'trabalhador';

  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState('');
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [pastaAberta, setPastaAberta] = useState<string | null>(null);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [novaPastaOpen, setNovaPastaOpen] = useState(false);
  const [novaPastaNome, setNovaPastaNome] = useState('');
  const [deletePastaId, setDeletePastaId] = useState<string | null>(null);
  const [deleteArquivoId, setDeleteArquivoId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTipo, setPreviewTipo] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [editPastaId, setEditPastaId] = useState<string | null>(null);
  const [editPastaNome, setEditPastaNome] = useState('');
  const [hoverArquivo, setHoverArquivo] = useState<Arquivo | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfPreviewCache = useRef<Record<string, string>>({});
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup pdf.js worker
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
  }, []);

  const renderPdfPreview = async (url: string, id: string) => {
    if (pdfPreviewCache.current[id]) {
      setPdfPreviewUrl(pdfPreviewCache.current[id]);
      return;
    }
    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      pdfPreviewCache.current[id] = dataUrl;
      setPdfPreviewUrl(dataUrl);
    } catch {
      setPdfPreviewUrl(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('obras').select('id, nome').order('nome');
      if (data) setObras(filterObras(data));
    };
    if (!obrasFilterLoading) load();
  }, [obrasFilterLoading]);

  // Load pastas when obra changes
  useEffect(() => {
    if (!obraSelecionada) { setPastas([]); setPastaAberta(null); return; }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('documentos_pastas')
        .select('*')
        .eq('obra_id', obraSelecionada)
        .order('created_at', { ascending: true });
      setPastas((data as Pasta[]) || []);
      setPastaAberta(null);
      setArquivos([]);
      setLoading(false);
    };
    load();
  }, [obraSelecionada]);

  // Load arquivos when pasta changes
  useEffect(() => {
    if (!pastaAberta) { setArquivos([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from('documentos_arquivos')
        .select('*')
        .eq('pasta_id', pastaAberta)
        .order('created_at', { ascending: true });
      setArquivos((data as Arquivo[]) || []);
    };
    load();
  }, [pastaAberta]);

  const criarPasta = async () => {
    if (!novaPastaNome.trim()) return;
    const { error } = await supabase.from('documentos_pastas').insert({
      obra_id: obraSelecionada,
      nome_pasta: novaPastaNome.trim(),
    });
    if (error) { toast.error('Erro ao criar pasta'); return; }
    toast.success('Pasta criada com sucesso');
    setNovaPastaOpen(false);
    setNovaPastaNome('');
    // Reload
    const { data } = await supabase.from('documentos_pastas').select('*').eq('obra_id', obraSelecionada).order('created_at');
    setPastas((data as Pasta[]) || []);
  };

  const renomearPasta = async () => {
    if (!editPastaId || !editPastaNome.trim()) return;
    const { error } = await supabase.from('documentos_pastas').update({ nome_pasta: editPastaNome.trim() }).eq('id', editPastaId);
    if (error) { toast.error('Erro ao renomear pasta'); return; }
    toast.success('Nome da pasta atualizado com sucesso');
    setEditPastaId(null);
    setEditPastaNome('');
    const { data } = await supabase.from('documentos_pastas').select('*').eq('obra_id', obraSelecionada).order('created_at');
    setPastas((data as Pasta[]) || []);
  };

  const excluirPasta = async () => {
    if (!deletePastaId) return;
    // Check if has files
    const { data: files } = await supabase.from('documentos_arquivos').select('id').eq('pasta_id', deletePastaId);
    if (files && files.length > 0) {
      // Delete files from storage first
      for (const f of files) {
        const { data: arquivo } = await supabase.from('documentos_arquivos').select('url_arquivo').eq('id', f.id).single();
        if (arquivo?.url_arquivo) {
          const path = extractStoragePath(arquivo.url_arquivo);
          if (path) await supabase.storage.from('anexos').remove([path]);
        }
      }
    }
    const { error } = await supabase.from('documentos_pastas').delete().eq('id', deletePastaId);
    if (error) { toast.error('Erro ao excluir pasta'); return; }
    toast.success('Pasta excluída');
    setDeletePastaId(null);
    if (pastaAberta === deletePastaId) setPastaAberta(null);
    const { data } = await supabase.from('documentos_pastas').select('*').eq('obra_id', obraSelecionada).order('created_at');
    setPastas((data as Pasta[]) || []);
  };

  const extractStoragePath = (url: string): string | null => {
    const match = url.match(/\/storage\/v1\/object\/public\/anexos\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!pastaAberta || !e.target.files?.length) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    setUploading(true);

    for (const file of Array.from(e.target.files)) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Tipo não permitido: ${file.name}`);
        continue;
      }

      const ext = file.name.split('.').pop();
      const path = `documentos/${obraSelecionada}/${pastaAberta}/${Date.now()}_${file.name}`;

      const { error: upErr } = await supabase.storage.from('anexos').upload(path, file);
      if (upErr) { toast.error(`Erro upload: ${file.name}`); continue; }

      const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(path);

      const tipo = file.type.startsWith('image') ? 'imagem' : 'pdf';
      const { error: insertErr } = await supabase.from('documentos_arquivos').insert({
        pasta_id: pastaAberta,
        nome_arquivo: file.name,
        tipo,
        url_arquivo: urlData.publicUrl,
        tamanho: file.size,
      });
      if (insertErr) {
        toast.error(`Erro ao salvar registro: ${file.name} - ${insertErr.message}`);
        continue;
      }
    }

    toast.success('Upload concluído');
    setUploading(false);
    e.target.value = '';
    // Reload
    const { data } = await supabase.from('documentos_arquivos').select('*').eq('pasta_id', pastaAberta).order('created_at');
    setArquivos((data as Arquivo[]) || []);
  };

  const excluirArquivo = async () => {
    if (!deleteArquivoId) return;
    const arq = arquivos.find(a => a.id === deleteArquivoId);
    if (arq) {
      const path = extractStoragePath(arq.url_arquivo);
      if (path) await supabase.storage.from('anexos').remove([path]);
    }
    await supabase.from('documentos_arquivos').delete().eq('id', deleteArquivoId);
    toast.success('Arquivo excluído');
    setDeleteArquivoId(null);
    const { data } = await supabase.from('documentos_arquivos').select('*').eq('pasta_id', pastaAberta).order('created_at');
    setArquivos((data as Arquivo[]) || []);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pastaAtual = pastas.find(p => p.id === pastaAberta);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Documentação</h1>
      </div>

      {/* Seleção de obra */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground">Obra:</label>
            <Select value={obraSelecionada} onValueChange={setObraSelecionada}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Selecione uma obra" />
              </SelectTrigger>
              <SelectContent>
                {obras.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!obraSelecionada && (
        <p className="text-muted-foreground text-center py-12">Selecione uma obra para visualizar a documentação.</p>
      )}

      {obraSelecionada && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Painel de pastas */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Pastas</CardTitle>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setNovaPastaOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-1" /> Nova
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && pastas.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma pasta criada.</p>
              )}
              {pastas.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    pastaAberta === p.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  }`}
                  onClick={() => setPastaAberta(p.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm truncate">{p.nome_pasta}</span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setEditPastaId(p.id); setEditPastaNome(p.nome_pasta); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setDeletePastaId(p.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Painel de arquivos */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                {pastaAtual ? `📁 ${pastaAtual.nome_pasta}` : 'Arquivos'}
              </CardTitle>
              {canManage && pastaAberta && (
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <Button size="sm" variant="outline" disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1" />
                    {uploading ? 'Enviando...' : 'Anexar'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!pastaAberta && (
                <p className="text-sm text-muted-foreground text-center py-8">Selecione uma pasta para ver os arquivos.</p>
              )}
              {pastaAberta && arquivos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum arquivo nesta pasta.</p>
              )}
              {pastaAberta && arquivos.length > 0 && (
                <div className="space-y-2">
                  {arquivos.map(arq => (
                    <div key={arq.id} className="relative flex items-center justify-between rounded-lg border px-4 py-3"
                      onMouseEnter={(e) => {
                        setHoverArquivo(arq);
                        setHoverPos({ x: e.clientX, y: e.clientY });
                        setPdfPreviewUrl(null);
                        if (arq.tipo === 'pdf') {
                          hoverTimeoutRef.current = setTimeout(() => renderPdfPreview(arq.url_arquivo, arq.id), 200);
                        }
                      }}
                      onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => {
                        setHoverArquivo(null);
                        setPdfPreviewUrl(null);
                        if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {arq.tipo === 'imagem' ? (
                          <Image className="h-5 w-5 shrink-0 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 shrink-0 text-destructive" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{arq.nome_arquivo}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(arq.tamanho)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setPreviewUrl(arq.url_arquivo);
                            setPreviewTipo(arq.tipo);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = arq.url_arquivo;
                            link.download = arq.nome_arquivo;
                            link.target = '_blank';
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setDeleteArquivoId(arq.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Nova Pasta */}
      <Dialog open={novaPastaOpen} onOpenChange={setNovaPastaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta"
            value={novaPastaNome}
            onChange={e => setNovaPastaNome(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaPastaOpen(false)}>Cancelar</Button>
            <Button onClick={criarPasta} disabled={!novaPastaNome.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete pasta */}
      <AlertDialog open={!!deletePastaId} onOpenChange={() => setDeletePastaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os arquivos dentro desta pasta serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirPasta} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete arquivo */}
      <AlertDialog open={!!deleteArquivoId} onOpenChange={() => setDeleteArquivoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Este arquivo será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirArquivo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Visualização</DialogTitle>
          </DialogHeader>
          {previewTipo === 'imagem' && previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full rounded-lg" />
          )}
          {previewTipo === 'pdf' && previewUrl && (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" title="PDF Preview" />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Pasta */}
      <Dialog open={!!editPastaId} onOpenChange={() => setEditPastaId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome da pasta</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta"
            value={editPastaNome}
            onChange={e => setEditPastaNome(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPastaId(null)}>Cancelar</Button>
            <Button onClick={renomearPasta} disabled={!editPastaNome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating hover preview */}
      {hoverArquivo && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: Math.min(hoverPos.x + 16, window.innerWidth - 320),
            top: Math.max(hoverPos.y - 200, 8),
          }}
        >
          {hoverArquivo.tipo === 'imagem' ? (
            <img
              src={hoverArquivo.url_arquivo}
              alt={hoverArquivo.nome_arquivo}
              className="w-72 max-h-56 object-contain rounded-lg border-2 bg-background shadow-xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : pdfPreviewUrl ? (
            <img
              src={pdfPreviewUrl}
              alt={hoverArquivo.nome_arquivo}
              className="w-72 max-h-64 object-contain rounded-lg border-2 bg-background shadow-xl"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border-2 bg-background shadow-xl px-6 py-4">
              <FileText className="h-10 w-10 text-destructive" />
              <span className="text-xs text-muted-foreground">Carregando preview...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
