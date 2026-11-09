import ListaExpansivel, { tituloComTotal } from './ListaExpansivel';
import PainelCard from './PainelCard';
import { useProximasEtapas } from '../hooks/useProximasEtapas';
import { fmtDataCurta } from '../utils';

export default function ProximasEtapasCard({ obraId }: { obraId: string }) {
  const { etapas, isLoading, isError } = useProximasEtapas(obraId);
  return (
    <PainelCard titulo={tituloComTotal('Próximas etapas', etapas.length)} link={{ to: `/cronograma?obra=${obraId}`, label: 'Ver cronograma' }} isLoading={isLoading} isError={isError}>
      {etapas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma etapa pendente no cronograma.</p>
      ) : (
        <ListaExpansivel itens={etapas} className="divide-y" render={(e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">{e.nome_atividade}</p>
                <p className="text-xs text-muted-foreground data-tech">{fmtDataCurta(e.data_inicio)} a {fmtDataCurta(e.data_fim)}</p>
              </div>
              <span className="text-sm data-tech text-muted-foreground">{e.percentual_concluido}%</span>
            </li>
          )} />
      )}
    </PainelCard>
  );
}
