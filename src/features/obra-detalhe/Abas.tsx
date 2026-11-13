import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusLaudoBadge from '@/features/relatorio-final/components/StatusLaudoBadge';
import { statusLaudo, tipoLaudo } from '@/features/relatorio-final/lib/status';
import { AbaCard, LimiteAviso, fmtData } from './ui';
import {
  LIMITE_ABA, useCronogramaObra, useDiariosObra, useFerramentasObra, useFuncionariosObra, useLaudosObra, useRelatoriosObra,
} from './hooks';

const tabelaWrap = 'hidden md:block overflow-x-auto';

// ---------- Andamento x prazo (Visão Geral) ----------
export function AndamentoPrazoCard({ obraId, ativo }: { obraId: string; ativo: boolean }) {
  const { indicadores: ind, isLoading } = useCronogramaObra(obraId, ativo);
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3"><CardTitle className="font-display text-base">Andamento x prazo</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>
        ) : !ind.planejamentoConfigurado ? (
          <p className="text-sm text-muted-foreground">Cronograma ainda não configurado.</p>
        ) : (
          <>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Progresso físico</span><span className="font-bold">{ind.progressoGlobal}%</span></div>
              <Progress value={ind.progressoGlobal} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Prazo consumido</span><span className="font-bold">{ind.prazoConsumido}%</span></div>
              <Progress value={Math.min(100, ind.prazoConsumido)} />
              <p className="mt-1 text-xs text-muted-foreground">{ind.diasConsumidos} de {ind.prazoEfetivo} dias úteis{ind.diasParados > 0 ? ` · ${ind.diasParados} parado(s)` : ''}</p>
            </div>
            <div className={`rounded-md border px-3 py-2 text-sm font-medium ${ind.statusObra.cls} ${ind.statusObra.color}`}>
              {ind.statusObra.dot} {ind.statusObra.label}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Cronograma ----------
export function CronogramaAba({ obraId, ativo }: { obraId: string; ativo: boolean }) {
  const { atividades, isLoading } = useCronogramaObra(obraId, ativo);
  const lista = atividades.slice(0, LIMITE_ABA);
  return (
    <AbaCard titulo="Atividades" link={`/cronograma?obra=${obraId}`} linkLabel="Abrir no Cronograma"
      isLoading={isLoading} vazio={lista.length === 0} vazioTexto="Nenhuma atividade cadastrada.">
      <div className={tabelaWrap}>
        <Table>
          <TableHeader><TableRow><TableHead>Atividade</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead className="w-40">Progresso</TableHead></TableRow></TableHeader>
          <TableBody>
            {lista.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nome_atividade}{a.tipo_atividade === 'aditivo' && <Badge variant="outline" className="ml-2 text-[10px]">Aditivo</Badge>}</TableCell>
                <TableCell>{fmtData(a.data_inicio)}</TableCell>
                <TableCell>{fmtData(a.data_fim)}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Progress value={a.percentual_concluido ?? 0} className="h-2" /><span className="w-10 text-right text-xs">{a.percentual_concluido ?? 0}%</span></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 md:hidden">
        {lista.map(a => (
          <div key={a.id} className="rounded-md border p-3 text-sm">
            <p className="break-words font-medium">{a.nome_atividade}</p>
            <p className="text-xs text-muted-foreground">{fmtData(a.data_inicio)} a {fmtData(a.data_fim)}</p>
            <div className="mt-2 flex items-center gap-2"><Progress value={a.percentual_concluido ?? 0} className="h-2" /><span className="text-xs">{a.percentual_concluido ?? 0}%</span></div>
          </div>
        ))}
      </div>
      {atividades.length > LIMITE_ABA && <LimiteAviso n={LIMITE_ABA} />}
    </AbaCard>
  );
}

// ---------- Diário ----------
export function DiarioAba({ obraId, ativo }: { obraId: string; ativo: boolean }) {
  const { data = [], isLoading, isError } = useDiariosObra(obraId, ativo);
  return (
    <AbaCard titulo="Últimos diários" link={`/diario?obra=${obraId}`} linkLabel="Abrir no Diário"
      isLoading={isLoading} isError={isError} vazio={data.length === 0} vazioTexto="Nenhum diário registrado.">
      <div className={tabelaWrap}>
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Clima</TableHead><TableHead>Horário</TableHead><TableHead>Observações</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map(d => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">{fmtData(d.data)}</TableCell>
                <TableCell className="capitalize">{d.clima}</TableCell>
                <TableCell className="whitespace-nowrap">{d.horario_inicio ? `${d.horario_inicio.slice(0, 5)} – ${d.horario_fim?.slice(0, 5) ?? ''}` : '—'}</TableCell>
                <TableCell className="max-w-md truncate">{d.observacoes_gerais || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 md:hidden">
        {data.map(d => (
          <div key={d.id} className="rounded-md border p-3 text-sm">
            <div className="flex justify-between gap-2"><span className="font-medium">{fmtData(d.data)}</span><span className="capitalize text-muted-foreground">{d.clima}</span></div>
            {d.observacoes_gerais && <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">{d.observacoes_gerais}</p>}
          </div>
        ))}
      </div>
      <LimiteAviso n={data.length} />
    </AbaCard>
  );
}

// ---------- Relatórios ----------
const statusRel = (s: string) => s === 'assinado' ? 'Assinado' : s === 'rascunho' ? 'Rascunho' : s;
export function RelatoriosAba({ obraId, ativo }: { obraId: string; ativo: boolean }) {
  const { data = [], isLoading, isError } = useRelatoriosObra(obraId, ativo);
  return (
    <AbaCard titulo="Relatórios" link={`/relatorios?obra=${obraId}`} linkLabel="Abrir em Relatórios"
      isLoading={isLoading} isError={isError} vazio={data.length === 0} vazioTexto="Nenhum relatório gerado.">
      <div className={tabelaWrap}>
        <Table>
          <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Progresso físico</TableHead><TableHead>Status</TableHead><TableHead>Criado em</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map(r => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{fmtData(r.data_inicio)} a {fmtData(r.data_fim)}</TableCell>
                <TableCell>{r.progresso_fisico != null ? `${r.progresso_fisico}%` : '—'}</TableCell>
                <TableCell><Badge variant={r.status === 'assinado' ? 'default' : 'secondary'}>{statusRel(r.status)}</Badge></TableCell>
                <TableCell>{fmtData(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 md:hidden">
        {data.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <div className="min-w-0"><p className="font-medium">{fmtData(r.data_inicio)} a {fmtData(r.data_fim)}</p>
              <p className="text-xs text-muted-foreground">Progresso: {r.progresso_fisico != null ? `${r.progresso_fisico}%` : '—'}</p></div>
            <Badge variant={r.status === 'assinado' ? 'default' : 'secondary'}>{statusRel(r.status)}</Badge>
          </div>
        ))}
      </div>
      <LimiteAviso n={data.length} />
    </AbaCard>
  );
}

// ---------- Laudos ----------
export function LaudosAba({ obraId, ativo }: { obraId: string; ativo: boolean }) {
  const { data = [], isLoading, isError } = useLaudosObra(obraId, ativo);
  return (
    <AbaCard titulo="Laudos técnicos" link={`/relatorio-final?obra=${obraId}`} linkLabel="Abrir em Laudos Técnicos"
      isLoading={isLoading} isError={isError} vazio={data.length === 0} vazioTexto="Nenhum laudo técnico.">
      <div className={tabelaWrap}>
        <Table>
          <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Emissão</TableHead><TableHead>Status</TableHead><TableHead>Atualizado</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{tipoLaudo(l.tipo_relatorio)}</TableCell>
                <TableCell>{fmtData(l.data_emissao)}</TableCell>
                <TableCell><StatusLaudoBadge status={statusLaudo(l)} /></TableCell>
                <TableCell>{fmtData(l.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 md:hidden">
        {data.map(l => (
          <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <div className="min-w-0"><p className="font-medium">{tipoLaudo(l.tipo_relatorio)}</p>
              <p className="text-xs text-muted-foreground">Atualizado em {fmtData(l.updated_at)}</p></div>
            <StatusLaudoBadge status={statusLaudo(l)} />
          </div>
        ))}
      </div>
      <LimiteAviso n={data.length} />
    </AbaCard>
  );
}

// ---------- Equipe ----------
const statusFerr: Record<string, string> = { disponivel: 'Disponível', em_uso: 'Em uso', manutencao: 'Manutenção' };
export function EquipeAba({ obraId, ativo, funcionarios, ferramentas }: { obraId: string; ativo: boolean; funcionarios: boolean; ferramentas: boolean }) {
  const func = useFuncionariosObra(obraId, ativo && funcionarios);
  const ferr = useFerramentasObra(obraId, ativo && ferramentas);
  const fl = func.data ?? [];
  const tl = ferr.data ?? [];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {funcionarios && (
        <AbaCard titulo="Funcionários" link="/funcionarios" linkLabel="Abrir Funcionários"
          isLoading={func.isLoading} isError={func.isError} vazio={fl.length === 0} vazioTexto="Nenhum funcionário alocado nesta obra.">
          <div className="space-y-2">
            {fl.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                <span className="min-w-0 break-words font-medium">{f.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{f.funcao || '—'}</span>
              </div>
            ))}
          </div>
          <LimiteAviso n={fl.length} />
        </AbaCard>
      )}
      {ferramentas && (
        <AbaCard titulo="Ferramentas" link="/ferramentas" linkLabel="Abrir Ferramentas"
          isLoading={ferr.isLoading} isError={ferr.isError} vazio={tl.length === 0} vazioTexto="Nenhuma ferramenta nesta obra.">
          <div className="space-y-2">
            {tl.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                <div className="min-w-0"><p className="break-words font-medium">{t.nome}</p><p className="text-xs text-muted-foreground">Nº {t.numero_cadastro}</p></div>
                <Badge variant="outline" className="shrink-0">{statusFerr[t.status] ?? t.status}</Badge>
              </div>
            ))}
          </div>
          <LimiteAviso n={tl.length} />
        </AbaCard>
      )}
    </div>
  );
}
