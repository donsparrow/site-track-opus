import { Check, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusLaudoBadge from './StatusLaudoBadge';
import { statusLaudo, tipoLaudo } from '../lib/status';
import type { LaudoLista } from '../hooks/useLaudosLista';

export default function LaudoCard({ laudo, externo, mostrarObra = true, onAbrir }: { laudo: LaudoLista; externo: boolean; mostrarObra?: boolean; onAbrir: () => void }) {
  const status = statusLaudo(laudo);
  return (
    <Button variant="outline" onClick={onAbrir} className="h-auto min-w-0 w-full flex-col items-stretch justify-start whitespace-normal p-5 text-left shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-tech">{tipoLaudo(laudo.tipo_relatorio)}</span><StatusLaudoBadge status={status} externo={externo} />
      </div>
      <div className="my-3 min-w-0 space-y-1">
        <h2 className="font-display text-lg font-semibold break-words">{externo ? tipoLaudo(laudo.tipo_relatorio) : laudo.obraNome}</h2>
        {externo && mostrarObra && <p className="text-sm text-muted-foreground break-words">{laudo.obraNome}</p>}
        {!externo && laudo.cliente_nome && <p className="text-sm text-muted-foreground break-words">{laudo.cliente_nome}</p>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {[['Empresa', laudo.assinatura_empresa_url], ['Cliente', laudo.assinatura_sindico_url]].map(([nome, assinatura]) => <span key={nome} className={`flex items-center gap-1 ${assinatura ? 'text-success' : 'text-muted-foreground'}`}>{assinatura ? <Check /> : <Clock />}{nome}{!assinatura && ' pendente'}</span>)}
      </div>
      <p className="data-tech mt-3 text-xs text-muted-foreground">Atualizado em {new Date(laudo.updated_at).toLocaleDateString('pt-BR')}</p>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">{!externo && status === 'rascunho' ? 'Continuar edição' : 'Abrir laudo'}<ChevronRight /></div>
    </Button>
  );
}