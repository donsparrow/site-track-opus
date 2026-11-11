import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FotoQuadro from './FotoQuadro';
import type { RelatorioFinalFoto } from '../types';

export default function FotoLightbox({ fotos, urls, indice, onIndice }: { fotos: RelatorioFinalFoto[]; urls: Record<string,string>; indice: number | null; onIndice: (i: number | null) => void }) {
  const foto = indice === null ? null : fotos[indice];
  useEffect(() => {
    if (indice === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft' && indice > 0) onIndice(indice - 1); if (e.key === 'ArrowRight' && indice < fotos.length - 1) onIndice(indice + 1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [indice, fotos.length, onIndice]);
  return <Dialog open={!!foto} onOpenChange={open => { if (!open) onIndice(null); }}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Foto {indice === null ? 0 : indice + 1} de {fotos.length}</DialogTitle><DialogDescription>{foto?.legenda || 'Registro fotográfico'}</DialogDescription></DialogHeader>{foto && <FotoQuadro src={urls[foto.foto_url]} alt={foto.legenda || 'Registro fotográfico'} orientacao={foto.orientacao} rotacao={foto.rotacao} lightbox />}<div className="flex justify-between gap-2"><Button variant="outline" disabled={indice === null || indice === 0} onClick={() => { if (indice !== null) onIndice(indice - 1); }}><ChevronLeft />Anterior</Button><Button variant="outline" disabled={indice === null || indice >= fotos.length - 1} onClick={() => { if (indice !== null) onIndice(indice + 1); }}>Próxima<ChevronRight /></Button></div></DialogContent></Dialog>;
}