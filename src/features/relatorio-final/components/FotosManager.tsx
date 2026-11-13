import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, ImagePlus, Trash2, RotateCw } from 'lucide-react';
import { useSignedUrls } from '../hooks/useSignedUrls';
import FotoQuadro from './FotoQuadro';
import PaginaFotosPreview from './PaginaFotosPreview';
import { proximaRotacao } from '../lib/fotoQuadro';
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
  onFormato?: (id: string, values: { orientacao?: 'horizontal' | 'vertical'; rotacao?: number }) => void;
  abas?: ReactNode;
  grupoLabel?: string;
  /** Quando definido (2/4/6/8), as fotos são mostradas inteiras e a miniatura abre a prévia da página. */
  fotosPorPagina?: number | null;
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

export default function FotosManager({ tipo, titulo, fotos, editable, uploading, onUpload, onLegenda, onMover, onExcluir, onFormato, abas, grupoLabel, fotosPorPagina }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const lista = fotos.filter((f) => f.tipo === tipo);
  const urls = useSignedUrls(lista.map((f) => f.foto_url));
  const emGrade = fotosPorPagina != null;
  const ordenadas = [...lista].sort((a, b) => a.ordem - b.ordem);

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
                {emGrade ? <Button variant="ghost" className="h-auto w-full rounded-none p-0" aria-label={`Ver prévia da foto ${i + 1} no relatório`} onClick={() => setPrevia(foto.id)}><FotoQuadro src={urls[foto.foto_url]} alt={foto.legenda || `Foto ${i + 1}`} orientacao={foto.orientacao} rotacao={foto.rotacao} modo="inteira" /></Button> : <FotoQuadro src={urls[foto.foto_url]} alt={foto.legenda || `Foto ${i + 1}`} orientacao={foto.orientacao} rotacao={foto.rotacao} />}
                <div className="p-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-1">{!emGrade && (['horizontal','vertical'] as const).map(o => <Button key={o} size="sm" variant={(foto.orientacao ?? 'horizontal') === o ? 'secondary' : 'outline'} className="min-h-11" disabled={!editable} aria-pressed={(foto.orientacao ?? 'horizontal') === o} onClick={() => onFormato?.(foto.id, { orientacao: o })}>{o === 'horizontal' ? 'Horizontal' : 'Vertical'}</Button>)}<Button size="icon" variant="ghost" className="min-h-11 min-w-11" title="Girar 90°" aria-label="Girar 90°" disabled={!editable} onClick={() => onFormato?.(foto.id, { rotacao: proximaRotacao(foto.rotacao) })}><RotateCw className="h-4 w-4" /></Button></div>
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
      <PaginaFotosPreview fotos={ordenadas} urls={urls} fotosPorPagina={fotosPorPagina} fotoId={previa} titulo={grupoLabel || tipo} onAbrir={setPrevia} />
    </Card>
  );
}
