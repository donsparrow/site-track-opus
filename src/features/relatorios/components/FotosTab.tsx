import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { agruparImagensPorData, fmt, type ImagemRelatorio } from '../utils';
import { useImagensRelatorio } from '../hooks/useImagensRelatorio';

const legenda = (figura: number, descricao?: string | null) => `Figura ${figura}${descricao ? ` – ${descricao}` : ''}`;

function Indisponivel({ className }: { className: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 bg-muted text-xs text-muted-foreground ${className}`}>
      <ImageOff className="h-5 w-5" /> Imagem indisponível
    </div>
  );
}

/** Registro fotográfico do período (somente leitura). */
export default function FotosTab({ imagens }: { imagens: ImagemRelatorio[] }) {
  const grupos = useMemo(() => agruparImagensPorData(imagens), [imagens]);
  const todas = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);
  const { data: urls, isLoading } = useImagensRelatorio(imagens);
  const [falhas, setFalhas] = useState<Record<string, boolean>>({});
  const [aberta, setAberta] = useState<number | null>(null);

  const total = todas.length;
  const mover = (d: number) => setAberta((i) => (i === null ? i : (i + d + total) % total));

  useEffect(() => {
    if (aberta === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') mover(-1);
      if (e.key === 'ArrowRight') mover(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta, total]);

  if (total === 0) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma foto registrada nos diários deste período</CardContent></Card>;
  }

  const atual = aberta !== null ? todas[aberta] : null;
  const urlAtual = atual ? urls?.[atual.id] ?? atual.url : '';

  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <section key={g.data || 'sem-data'} className="space-y-3">
          <h3 className="font-display text-sm font-semibold">{g.data ? `Registros de ${fmt(g.data)}` : 'Registros sem data'}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.itens.map((img) => {
              const idx = img.figura - 1;
              return (
                <button key={img.id} type="button" onClick={() => setAberta(idx)}
                  className="min-w-0 rounded-md border bg-card p-2 text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {isLoading ? (
                    <Skeleton className="h-36 w-full rounded" />
                  ) : falhas[img.id] ? (
                    <Indisponivel className="h-36 w-full rounded" />
                  ) : (
                    <img src={urls?.[img.id] ?? img.url} alt={legenda(img.figura, img.descricao)} loading="lazy" decoding="async"
                      onError={() => setFalhas((f) => ({ ...f, [img.id]: true }))}
                      className="h-36 w-full rounded bg-muted object-cover" />
                  )}
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{legenda(img.figura, img.descricao)}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <Dialog open={atual !== null} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-w-4xl">
          {atual && (
            <div className="space-y-3">
              <DialogTitle className="text-base">{legenda(atual.figura, atual.descricao)}</DialogTitle>
              <DialogDescription>
                {atual.data_diario ? `Registro de ${fmt(atual.data_diario)}` : 'Registro sem data'} · {aberta! + 1} de {total}
              </DialogDescription>
              {falhas[atual.id] ? (
                <Indisponivel className="h-64 w-full rounded" />
              ) : (
                <img src={urlAtual} alt={legenda(atual.figura, atual.descricao)}
                  onError={() => setFalhas((f) => ({ ...f, [atual.id]: true }))}
                  className="mx-auto max-h-[75vh] w-full rounded object-contain" />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => mover(-1)} disabled={total < 2}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => mover(1)} disabled={total < 2}>Próxima <ChevronRight className="h-4 w-4" /></Button>
                </div>
                <Button variant="ghost" size="sm" className="text-accent" onClick={() => window.open(urlAtual, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="h-4 w-4" /> Abrir original
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
