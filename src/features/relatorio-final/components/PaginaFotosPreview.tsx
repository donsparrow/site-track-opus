import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FotoQuadro from './FotoQuadro';
import { celulaDaGrade, layoutGradeFotos } from '../lib/fotoQuadro';
import type { RelatorioFinalFoto } from '../types';

/**
 * Geometria em mm idêntica à do PDF (pdfRelatorioFinal.ts): A4 210x297,
 * margem 15, cabeçalho que termina em y=32, nova página devolve 32+6+6=44 e o
 * título do grupo soma 8. Usada para posicionar as células da prévia.
 */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const Y_TOPO = 44;
const Y_INICIAL = Y_TOPO + 8;
/** 1 ponto (unidade da fonte no PDF) em mm. */
const PT = 0.3528;

const clamp2: CSSProperties = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

interface Props {
  /** Fotos do grupo já na ordem do laudo (ordem crescente). */
  fotos: RelatorioFinalFoto[];
  urls: Record<string, string>;
  fotosPorPagina: number | null | undefined;
  fotoId: string | null;
  titulo: string;
  onAbrir: (id: string | null) => void;
}

/** Prévia da página do relatório que contém a foto clicada, com a mesma grade do PDF. */
export default function PaginaFotosPreview({ fotos, urls, fotosPorPagina, fotoId, titulo, onAbrir }: Props) {
  const grade = useMemo(() => layoutGradeFotos(fotosPorPagina, CONTENT_W, PAGE_H, Y_INICIAL), [fotosPorPagina]);
  const [pagina, setPagina] = useState(0);
  const idx = fotoId ? fotos.findIndex((f) => f.id === fotoId) : -1;
  const aberta = !!grade && !!fotoId && idx >= 0;
  const total = grade && fotos.length ? Math.ceil(fotos.length / grade.fotosPorPagina) : 0;

  useEffect(() => {
    if (grade && idx >= 0) setPagina(Math.floor(idx / grade.fotosPorPagina));
  }, [grade, idx]);

  useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPagina((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setPagina((p) => Math.min(total - 1, p + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberta, total]);

  const porPagina = grade?.fotosPorPagina || 1;
  const inicio = pagina * porPagina;
  const daPagina = grade ? fotos.slice(inicio, inicio + porPagina) : [];

  return <Dialog open={aberta} onOpenChange={(open) => { if (!open) onAbrir(null); }}>
    <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Prévia no relatório</DialogTitle>
        <DialogDescription className="break-words">{titulo}</DialogDescription>
      </DialogHeader>
      {grade && <div className="mx-auto w-full" style={{ aspectRatio: `${PAGE_W} / ${PAGE_H}`, containerType: 'inline-size' }}>
        {/* O papel: branco de propósito, é a folha impressa. */}
        <div className="relative h-full w-full border bg-white shadow-sm">
          {pagina === 0 && <p className="absolute font-semibold uppercase text-primary" style={{ left: pct(MARGIN, PAGE_W), top: pct(Y_TOPO, PAGE_H), fontSize: pct(13 * PT, PAGE_W) }}>{titulo}</p>}
          {daPagina.map((foto, i) => {
            const celula = celulaDaGrade(grade, i, MARGIN, pagina === 0 ? Y_INICIAL : Y_TOPO);
            const numero = inicio + i + 1;
            const destacada = foto.id === fotoId;
            return <div key={foto.id} className={`absolute overflow-hidden ${destacada ? 'ring-2 ring-primary' : ''}`} style={{ left: pct(celula.x, PAGE_W), top: pct(celula.y, PAGE_H), width: pct(celula.largura, PAGE_W), height: pct(celula.altura, PAGE_H) }}>
              <div style={{ height: pct(grade.areaFotoAltura, grade.celulaAltura) }}>
                <FotoQuadro src={urls[foto.foto_url]} alt={foto.legenda || `Foto ${numero}`} rotacao={foto.rotacao ?? 0} modo="inteira" quadro={{ largura: celula.largura, altura: grade.areaFotoAltura }} />
              </div>
              <p className="text-center leading-tight" style={{ ...clamp2, fontSize: pct(grade.fonteLegenda * PT, PAGE_W) }}>{`Foto ${String(numero).padStart(2, '0')}${foto.legenda ? ` — ${foto.legenda}` : ''}`}</p>
            </div>;
          })}
        </div>
      </div>}
      <DialogFooter className="items-center gap-3 sm:justify-between">
        <p className="text-sm text-muted-foreground">Página {Math.min(pagina + 1, Math.max(total, 1))} de {total} deste grupo</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={pagina <= 0} onClick={() => setPagina((p) => Math.max(0, p - 1))}><ChevronLeft />Anterior</Button>
          <Button variant="outline" disabled={pagina >= total - 1} onClick={() => setPagina((p) => Math.min(total - 1, p + 1))}>Próxima<ChevronRight /></Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
