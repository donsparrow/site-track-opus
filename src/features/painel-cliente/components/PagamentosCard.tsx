import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import PainelCard from './PainelCard';
import { usePagamentosCliente } from '../hooks/usePagamentosCliente';
import { fmtDataCurta, fmtDiaMes, fmtMoeda, situacaoParcela } from '../utils';
import { Button } from '@/components/ui/button';
import { hojeLocal } from '@/lib/dataLocal';

export default function PagamentosCard({ obraId }: { obraId: string }) {
  const { data = [], isLoading, isError } = usePagamentosCliente(obraId, true);
  const hoje = hojeLocal();
  const pagas = data.filter((p) => p.data_recebimento);
  const total = data.reduce((s, p) => s + Number(p.valor), 0);
  const pago = pagas.reduce((s, p) => s + Number(p.valor), 0);
  const [todas, setTodas] = useState(false);
  const ordenadas = [...data].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento) || a.numero_parcela - b.numero_parcela);
  const proxima = ordenadas.find((p) => !p.data_recebimento);
  const ultimasPagas = ordenadas.filter((p) => p.data_recebimento).slice(-2);
  const resumo = ordenadas.filter((p) => p === proxima || ultimasPagas.includes(p));
  const linhas = todas ? ordenadas : resumo;
  const pct = data.length ? Math.round((pagas.length / data.length) * 100) : 0;

  return (
    <PainelCard titulo="Pagamentos" isLoading={isLoading} isError={isError}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma parcela registrada para esta obra.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Badge variant="outline" className="border-success text-success">{pagas.length} de {data.length} parcelas pagas</Badge>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-label="Parcelas pagas">
              <div className="h-full bg-success" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="text-sm">Total pago <strong className="data-tech">{fmtMoeda(pago)}</strong> de <strong className="data-tech">{fmtMoeda(total)}</strong></p>
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            {proxima ? (
              <span>{situacaoParcela(proxima, hoje) === 'vencida' ? <strong className="text-destructive">Vencida: </strong> : <strong>Próxima parcela: </strong>}
                <span className="data-tech">{proxima.numero_parcela}/{proxima.total_parcelas} · vence {fmtDataCurta(proxima.data_vencimento)} · {fmtMoeda(Number(proxima.valor))}</span></span>
            ) : <strong className="text-success">Todas as parcelas foram pagas</strong>}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr><th className="p-2">Parcela</th><th className="p-2">Vencimento</th><th className="p-2">Situação</th><th className="p-2 text-right">Valor</th></tr>
              </thead>
              <tbody>
                {linhas.map((p) => {
                  const s = situacaoParcela(p, hoje);
                  return (
                    <tr key={p.numero_parcela} className="border-t">
                      <td className="p-2 data-tech">{p.numero_parcela}/{p.total_parcelas}</td>
                      <td className="p-2 data-tech">{fmtDataCurta(p.data_vencimento)}</td>
                      <td className="p-2">
                        {s === 'pago' && <span className="font-medium text-success">Pago em {fmtDiaMes(p.data_recebimento)}</span>}
                        {s === 'vencida' && <span className="text-destructive/80">Vencida</span>}
                        {s === 'a_vencer' && <span className="text-muted-foreground">A vencer</span>}
                      </td>
                      <td className="p-2 text-right data-tech">{fmtMoeda(Number(p.valor))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ordenadas.length > resumo.length && (
            <Button type="button" variant="link" size="sm" className="h-auto px-0 text-accent" aria-expanded={todas} onClick={() => setTodas((v) => !v)}>
              {todas ? 'Ver menos' : `Ver todas as parcelas (${ordenadas.length})`}
            </Button>
          )}
        </div>
      )}
    </PainelCard>
  );
}
