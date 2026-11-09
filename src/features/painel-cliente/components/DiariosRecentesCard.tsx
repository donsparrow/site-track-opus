import { Badge } from '@/components/ui/badge';
import PainelCard from './PainelCard';
import { useDiariosRecentes } from '../hooks/useDiariosRecentes';
import { fmtDataCurta } from '../utils';

export default function DiariosRecentesCard({ obraId }: { obraId: string }) {
  const { data = [], isLoading, isError } = useDiariosRecentes(obraId);
  return (
    <PainelCard titulo="Esta semana na obra" link={{ to: `/diario?obra=${obraId}`, label: 'Ver diário' }} isLoading={isLoading} isError={isError}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum diário registrado ainda.</p>
      ) : (
        <ul className="divide-y">
          {data.map((d) => (
            <li key={d.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              {d.foto ? (
                <img src={d.foto} alt={`Foto do diário de ${fmtDataCurta(d.data)}`} loading="lazy" decoding="async"
                  className="h-14 w-14 shrink-0 rounded-md object-cover bg-muted" />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-md bg-muted" aria-hidden />
              )}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold data-tech">{fmtDataCurta(d.data)}</span>
                  {d.paralisacao && <Badge variant="outline" className="border-destructive/40 text-destructive">Paralisado · {d.paralisacao}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{d.resumo}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PainelCard>
  );
}
