import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Pencil, Save, Trash2, Upload, X } from 'lucide-react';
import type { DiarioImagem } from '../types';

interface Props {
  imagens: DiarioImagem[];
  canEdit: boolean;
  canEditDelete: boolean;
  onUpload: (v: { file: File; descricao: string; onProgress?: (p: number) => void }) => void;
  onUpdateLegenda: (v: { id: string; descricao: string }) => void;
  onDelete: (id: string) => void;
}

export function GaleriaImagens({ imagens, canEdit, canEditDelete, onUpload, onUpdateLegenda, onDelete }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-display">Registro Fotográfico</CardTitle>
        {canEdit && <ImageUploadButton onUpload={onUpload} />}
      </CardHeader>
      <CardContent>
        {imagens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma imagem</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {imagens.map((img, idx) => (
              <ImageCard
                key={img.id}
                img={img}
                numero={idx + 1}
                canEdit={canEditDelete}
                onDelete={() => onDelete(img.id)}
                onUpdateDescricao={(descricao) => onUpdateLegenda({ id: img.id, descricao })}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImageCard({ img, numero, canEdit, onDelete, onUpdateDescricao }: {
  img: DiarioImagem; numero: number; canEdit: boolean;
  onDelete: () => void; onUpdateDescricao: (d: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(img.descricao || '');
  const padded = String(numero).padStart(2, '0');

  return (
    <div className="rounded-lg border overflow-hidden group">
      <div className="relative">
        <img src={img.url} alt={img.descricao || `Foto ${padded}`} className="w-full h-40 object-cover" loading="lazy" />
        <div className="absolute top-1 left-1 bg-background/80 text-foreground text-xs font-bold px-2 py-0.5 rounded">
          Foto {padded}
        </div>
        {canEdit && (
          <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="p-2">
        {editing ? (
          <div className="flex gap-1">
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-7 text-xs" placeholder="Legenda da foto..." />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { onUpdateDescricao(desc); setEditing(false); }}><Save className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setDesc(img.descricao || ''); setEditing(false); }}><X className="h-3 w-3" /></Button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs text-muted-foreground flex-1">{img.descricao || <span className="italic">Sem legenda</span>}</p>
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageUploadButton({ onUpload }: { onUpload: Props['onUpload'] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const enviar = () => {
    if (!file) return;
    setProgress(0);
    onUpload({
      file,
      descricao,
      onProgress: (p) => {
        setProgress(p);
        if (p >= 100) {
          setOpen(false);
          setFile(null);
          setProgress(null);
        }
      },
    });
  };

  return (
    <>
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setFile(f); setDescricao(''); setProgress(null); setOpen(true); }
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
        <Upload className="h-3 w-3 mr-1" />Adicionar Foto
      </Button>
      {open && file && (
        <Dialog open={open} onOpenChange={(v) => { if (progress === null) setOpen(v); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Adicionar Foto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              <div>
                <Label className="text-xs">Legenda (opcional)</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Execução de reboco na fachada lateral" />
              </div>
              {progress !== null && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">Enviando... {progress}%</p>
                </div>
              )}
              <Button className="w-full" disabled={progress !== null} onClick={enviar}>
                <Upload className="h-4 w-4 mr-2" /> Enviar Foto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
