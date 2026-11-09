import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import ListaExpansivel, { tituloComTotal } from './ListaExpansivel';
import PainelCard from './PainelCard';
import { useDocumentosRecentes } from '../hooks/useDocumentosRecentes';
import { fmtDataCurta } from '../utils';

export default function DocumentosRecentesCard({ obraId, podeLaudos }: { obraId: string; podeLaudos: boolean }) {
  const { data = [], isLoading, isError } = useDocumentosRecentes(obraId, podeLaudos);
  return (
    <PainelCard titulo={tituloComTotal('Documentos recentes', data.length)} link={{ to: '/documentacao', label: 'Ver todos' }} isLoading={isLoading} isError={isError}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento liberado ainda.</p>
      ) : (
        <ListaExpansivel itens={data} className="divide-y" render={(d) => (
            <li key={`${d.origem}-${d.id}`} className="py-2.5 first:pt-0 last:pb-0">
              <Link to={d.link} className="text-sm font-medium hover:underline break-words">{d.titulo}</Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Badge variant="secondary">{d.origem}</Badge><span>{fmtDataCurta(d.data)}</span>
              </div>
            </li>
          )} />
      )}
    </PainelCard>
  );
}
