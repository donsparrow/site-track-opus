import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, X } from 'lucide-react';
import type { TipoRegistroAnexo } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registroId: string | null;
  tipoRegistro: TipoRegistroAnexo;
  uploading: boolean;
  onUpload: (tipoAnexo: string, files: File[]) => void;
}

export default function AnexoUploadDialog({ open, onOpenChange, registroId, uploading, onUpload }: Props) {
  const [tipoAnexo, setTipoAnexo] = useState('nota_fiscal');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (o: boolean) => {
    if (!o) { setFiles([]); setTipoAnexo('nota_fiscal'); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Anexar Arquivos</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Documento</Label>
            <Select value={tipoAnexo} onValueChange={setTipoAnexo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nota_fiscal">📄 Nota Fiscal</SelectItem>
                <SelectItem value="boleto">💳 Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arquivos (PDF, JPG, PNG)</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              className="hidden"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
            />
            <Button type="button" variant="outline" size="sm" className="mt-1 w-full" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4 mr-1" /> Selecionar Arquivos
            </Button>
          </div>
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={() => { if (registroId) onUpload(tipoAnexo, files); }}
            disabled={files.length === 0 || uploading}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {uploading ? 'Enviando...' : `Enviar ${files.length} arquivo(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
