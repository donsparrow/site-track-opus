import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Import, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLaudosLista } from '../hooks/useLaudosLista';
import { relatorioFinalKeys } from '../queryKeys';
import { resolverSecoes } from '../lib/secoes';
import { statusLaudo, tipoLaudo } from '../lib/status';
import { importarSecoes, textoPuro } from '../lib/importarTexto';
import StatusLaudoBadge from './StatusLaudoBadge';
import type { RelatorioFinal, SecaoExtra } from '../types';

interface Props {
  relatorio: RelatorioFinal;
  obraNome: string;
  secoes: SecaoExtra[];
  onImportar: (secoes: SecaoExtra[]) => void;
}

const linhas2 = {
  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
} as const;

/** Importa blocos de texto de outro laudo, acrescentando-os ao fim dos atuais. */
export default function ImportarTextoDialog({ relatorio, obraNome, secoes, onImportar }: Props) {
  const { laudos, isLoading } = useLaudosLista();
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<1 | 2>(1);
  const [soMesmoTipo, setSoMesmoTipo] = useState(true);
  const [busca, setBusca] = useState('');
  const [origemId, setOrigemId] = useState<string | null>(null);
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set());

  const origem = laudos.find(l => l.id === origemId) ?? null;

  const opcoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return laudos.filter(l => l.id !== relatorio.id
      && (!soMesmoTipo || l.tipo_relatorio === relatorio.tipo_relatorio)
      && (!termo || `${l.obraNome} ${l.cliente_nome ?? ''}`.toLowerCase().includes(termo)));
  }, [laudos, relatorio.id, relatorio.tipo_relatorio, soMesmoTipo, busca]);

  const consulta = useQuery({
    queryKey: relatorioFinalKeys.importado(origemId),
    enabled: aberto && passo === 2 && !!origemId,
    queryFn: async () => {
      const { data, error } = await supabase.from('relatorios_finais')
        .select('id, tipo_relatorio, secoes, secoes_extras, titulo_introducao, conteudo_introducao, titulo_garantia, conteudo_garantia, titulo_aditivo, conteudo_aditivo, titulo_conclusao, conteudo_conclusao')
        .eq('id', origemId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const blocos = useMemo(() => (
    consulta.data ? resolverSecoes(consulta.data as unknown as RelatorioFinal).filter(b => textoPuro(b.conteudo)) : []
  ), [consulta.data]);

  const marcados = blocos.filter(b => !desmarcados.has(b.id));

  const fechar = () => {
    setAberto(false); setPasso(1); setOrigemId(null); setDesmarcados(new Set());
    setBusca(''); setSoMesmoTipo(true);
  };

  const escolher = (id: string) => { setOrigemId(id); setDesmarcados(new Set()); setPasso(2); };

  const alternar = (id: string) => setDesmarcados(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const importar = () => {
    if (!marcados.length || !origem) return;
    onImportar(importarSecoes(secoes, marcados, {
      obraOrigem: origem.obraNome, obraAtual: obraNome,
      clienteOrigem: origem.cliente_nome, clienteAtual: relatorio.cliente_nome,
    }));
    toast.success(`${marcados.length} blocos importados. Revise nomes, datas e quantitativos.`);
    fechar();
  };

  return <>
    <Button variant="outline" size="sm" className="mb-2" onClick={() => setAberto(true)}>
      <Import className="mr-1 h-4 w-4" />Importar de outro laudo
    </Button>

    <Dialog open={aberto} onOpenChange={o => (o ? setAberto(true) : fechar())}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar texto de outro laudo</DialogTitle>
          <DialogDescription>
            {passo === 1
              ? 'Escolha o laudo que serve de base. Ele não será alterado.'
              : `Blocos de ${origem?.obraNome ?? 'outro laudo'}. Marque os que quer acrescentar ao final deste laudo.`}
          </DialogDescription>
        </DialogHeader>

        {passo === 1 && <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por obra ou cliente" className="pl-9" aria-label="Buscar laudo" />
            </div>
            <div className="flex gap-1" role="group" aria-label="Filtro de tipo de laudo">
              <Button size="sm" variant={soMesmoTipo ? 'default' : 'outline'} aria-pressed={soMesmoTipo} onClick={() => setSoMesmoTipo(true)}>Mesmo tipo</Button>
              <Button size="sm" variant={!soMesmoTipo ? 'default' : 'outline'} aria-pressed={!soMesmoTipo} onClick={() => setSoMesmoTipo(false)}>Todos os tipos</Button>
            </div>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground" role="status">Carregando laudos…</p>
            : !opcoes.length ? <p className="text-sm text-muted-foreground">Nenhum outro laudo encontrado.</p>
              : <div className="grid grid-cols-1 gap-2">{opcoes.map(l => <Button key={l.id} variant="outline" className="h-auto min-w-0 w-full flex-col items-stretch justify-start whitespace-normal p-3 text-left" onClick={() => escolher(l.id)}>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="label-tech">{tipoLaudo(l.tipo_relatorio)}</span>
                  <StatusLaudoBadge status={statusLaudo(l)} />
                </span>
                <span className="mt-1 block min-w-0">
                  <span className="block font-display text-sm font-semibold break-words">{l.obraNome}</span>
                  {l.cliente_nome && <span className="block text-xs text-muted-foreground break-words">{l.cliente_nome}</span>}
                  <span className="data-tech block text-xs text-muted-foreground">Atualizado em {new Date(l.updated_at).toLocaleDateString('pt-BR')}</span>
                </span>
              </Button>)}</div>}
        </div>}

        {passo === 2 && <div className="space-y-2">
          {consulta.isLoading ? <p className="text-sm text-muted-foreground" role="status">Carregando blocos…</p>
            : consulta.isError ? <p className="text-sm text-destructive">Não foi possível ler os blocos deste laudo.</p>
              : !blocos.length ? <p className="text-sm text-muted-foreground">O laudo escolhido não tem texto para importar.</p>
                : blocos.map(b => { const marcado = !desmarcados.has(b.id); return <div key={b.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${marcado ? 'border-primary/40 bg-primary/5' : ''}`} onClick={e => { if (!(e.target as HTMLElement).closest('[role="checkbox"]')) alternar(b.id); }}>
                  <Checkbox checked={marcado} onCheckedChange={() => alternar(b.id)} className="mt-1" aria-label={`Importar o bloco ${b.titulo}`} />
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-semibold break-words">{b.titulo}</span>
                    <span className="block text-xs text-muted-foreground" style={linhas2}>{textoPuro(b.conteudo)}</span>
                  </span>
                </div>; })}
        </div>}

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          {passo === 1
            ? <Button variant="outline" onClick={fechar}>Cancelar</Button>
            : <>
              <Button variant="outline" onClick={() => setPasso(1)}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
              <Button onClick={importar} disabled={!marcados.length}>
                <Import className="mr-1 h-4 w-4" />Importar {marcados.length} bloco{marcados.length === 1 ? '' : 's'}
              </Button>
            </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
