import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { useSignedUrls } from '../hooks/useSignedUrls';
import type { RelatorioFinalFoto, TipoFoto } from '../types';

interface Props {
  tipo: TipoFoto;
  titulo: ReactNode;
  fotos: RelatorioFinalFoto[];
  editable: boolean;
  uploading?: boolean;
  onUpload: (files: File[]) => void;
  onLegenda: (id: string, legenda: string) => void;
  onMover: (id: string, direcao: -1 | 1) => void;
  onExcluir: (foto: RelatorioFinalFoto) => void;
  abas?: ReactNode;
  grupoLabel?: string;
}

function FotoLegendaInput({
  foto,
  index,
  editable,
  onLegenda,
}: {
  foto: RelatorioFinalFoto;
  index: number;
  editable: boolean;
  onLegenda: (id: string, legenda: string) => void;
}) {
  const [local, setLocal] = useState(foto.legenda || '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(foto.legenda || '');
  }, [foto.legenda]);

  return (
    <Input
      value={local}
      placeholder={`Legenda da foto ${index + 1}`}
      disabled={!editable}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        if (local !== (foto.legenda || '')) onLegenda(foto.id, local);
      }}
    />
  );
}

export default function FotosManager({ tipo, titulo, fotos, editable, uploading, onUpload, onLegenda, onMover, onExcluir, abas, grupoLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lista = fotos.filter((f) => f.tipo === tipo);
  const urls = useSignedUrls(lista.map((f) => f.foto_url));

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle className="font-display text-base">{typeof titulo === 'string' ? `${titulo} (${lista.length})` : titulo}</CardTitle>
        {abas && <div className="w-full">{abas}</div>}
        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) onUpload(files);
                e.target.value = '';
              }}
            />
            <Button size="sm" className="h-auto min-h-11 max-w-full whitespace-normal" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <ImagePlus className="h-4 w-4 mr-1" /> {uploading ? 'Enviando...' : `Adicionar fotos em “${grupoLabel || tipo}”`}
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma foto adicionada.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((foto, i) => (
              <div key={foto.id} className={`border rounded-lg overflow-hidden ${!foto.legenda?.trim() ? 'border-warning' : ''}`}>
                {urls[foto.foto_url] ? (
                  <img src={urls[foto.foto_url]} alt={foto.legenda || `Foto ${i + 1}`} className="h-40 w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="h-40 w-full bg-muted" />
                )}
                <div className="p-2 space-y-2">
                  <FotoLegendaInput foto={foto} index={i} editable={editable} onLegenda={onLegenda} />
                  {!foto.legenda?.trim() && <p className="text-xs text-warning">Sem legenda</p>}
                  {editable && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => onMover(foto.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" disabled={i === lista.length - 1} onClick={() => onMover(foto.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => onExcluir(foto)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
