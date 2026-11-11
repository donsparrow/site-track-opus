import { useMemo, useState } from 'react';
import { FilePlus2, PenLine, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useLaudosLista } from '../hooks/useLaudosLista';
import { statusLaudo, tipoLaudo, type StatusLaudo } from '../lib/status';
import LaudoCard from './LaudoCard';
import NovoLaudoDialog from './NovoLaudoDialog';

export default function LaudosLista({ externo, onAbrir }: { externo: boolean; onAbrir: (obra: string, tipo: string) => void }) {
  const { laudos, obras, isLoading, error } = useLaudosLista();
  const { pode } = usePermissions();
  const [novo, setNovo] = useState(false);
  const [filtro, setFiltro] = useState<StatusLaudo | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [obra, setObra] = useState('todas');
  const [tipo, setTipo] = useState('todos');
  const podeCriar = !externo && pode('relatorio_final', 'criar');
  const lista = useMemo(() => {
    const ordem = { rascunho: 0, aguardando: 1, assinado: 2 };
    return laudos.filter(r => externo || ((filtro === 'todos' || statusLaudo(r) === filtro) && (obra === 'todas' || r.obra_id === obra) && (tipo === 'todos' || r.tipo_relatorio === tipo) && `${r.obraNome} ${r.cliente_nome ?? ''}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))))
      .sort((a,b) => ordem[statusLaudo(a)] - ordem[statusLaudo(b)] || b.updated_at.localeCompare(a.updated_at));
  }, [laudos, externo, filtro, obra, tipo, busca]);
  const pendentes = laudos.filter(r => statusLaudo(r) === 'aguardando');
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="font-display text-2xl font-bold">Laudos Técnicos</h1><p className="text-sm text-muted-foreground">{externo ? obras.length === 1 ? obras[0].nome : '' : 'Entrega de Obra e Vistoria Prévia — elaboração, revisão e assinaturas.'}</p></div>{podeCriar && <Button onClick={() => setNovo(true)} className="bg-accent text-accent-foreground hover:bg-accent/90"><FilePlus2 />Novo laudo</Button>}</header>
    {!externo && <div className="space-y-4"><div className="flex flex-wrap gap-2">{(['todos','rascunho','aguardando','assinado'] as const).map(s => <Button key={s} size="sm" variant={filtro === s ? 'default' : 'outline'} aria-pressed={filtro === s} onClick={() => setFiltro(s)}>{({todos:'Todos',rascunho:'Rascunhos',aguardando:'Aguardando cliente',assinado:'Assinados'})[s]} · {s === 'todos' ? laudos.length : laudos.filter(r => statusLaudo(r) === s).length}</Button>)}</div>
      <div className="grid gap-3 sm:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar obra ou cliente" placeholder="Buscar obra ou cliente" value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" /></div><Select value={obra} onValueChange={setObra}><SelectTrigger aria-label="Filtrar obra"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as obras</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select><Select value={tipo} onValueChange={setTipo}><SelectTrigger aria-label="Filtrar tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="entrega_obra">Entrega de Obra</SelectItem><SelectItem value="vistoria_previa">Vistoria Prévia</SelectItem></SelectContent></Select></div>
    </div>}
    {isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0,1,2].map(i => <Skeleton key={i} className="h-60" />)}</div> : error ? <p role="alert" className="text-destructive">Não foi possível carregar os laudos. Tente novamente.</p> : <>
      {externo && pendentes.length > 0 && <Card className="border-2 border-warning"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><PenLine className="h-4 w-4 text-warning" />Aguardando sua assinatura ({pendentes.length})</CardTitle></CardHeader><CardContent className="space-y-3">{pendentes.map(r => <div key={r.id} className="flex flex-col gap-3 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium">{tipoLaudo(r.tipo_relatorio)}{obras.length > 1 && ` — ${r.obraNome}`}</p><p className="text-sm text-muted-foreground">Assinado pela J&A em {r.assinatura_empresa_data ? new Date(`${r.assinatura_empresa_data}T00:00:00`).toLocaleDateString('pt-BR') : 'data não informada'}</p></div><Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => onAbrir(r.obra_id,r.tipo_relatorio)}>Ler e assinar</Button></div>)}</CardContent></Card>}
      {lista.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{lista.map(r => <LaudoCard key={r.id} laudo={r} externo={externo} mostrarObra={obras.length > 1} onAbrir={() => onAbrir(r.obra_id,r.tipo_relatorio)} />)}</div> : <div className="space-y-3 py-16 text-center"><h2 className="font-display text-lg font-semibold">{externo ? 'Nenhum laudo disponível ainda' : laudos.length ? 'Nenhum laudo com esses filtros.' : 'Nenhum laudo criado ainda.'}</h2>{externo ? <p className="text-sm text-muted-foreground">Quando a J&A concluir um laudo desta obra, ele aparecerá aqui.</p> : podeCriar && !laudos.length && <Button onClick={() => setNovo(true)} className="bg-accent text-accent-foreground hover:bg-accent/90"><FilePlus2 />Novo laudo</Button>}</div>}
    </>}
    {novo && <NovoLaudoDialog open={novo} onOpenChange={setNovo} obras={obras} laudos={laudos} onAbrir={onAbrir} />}
  </div>;
}