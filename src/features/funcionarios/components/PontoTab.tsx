import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import type { Funcionario, ObraOption, PontoRegistro, PontoStatus } from '../types';
import { corDaObra, parseISODate, resolverCelula, rotuloCiclo, siglaObra } from '../utils';
import PontoCelulaDialog, { type CelulaSelecionada } from './PontoCelulaDialog';

interface Props {
  funcionarios: Funcionario[];
  obras: ObraOption[];
  registros: PontoRegistro[];
  dias: string[];
  isLoading: boolean;
  canEdit: boolean;
  saving: boolean;
  isAdmin: boolean;
  ancora: string | null;
  savingAncora?: boolean;
  onAnterior: () => void;
  onProxima: () => void;
  onHoje: () => void;
  onSalvarAncora: (ancoraISO: string) => void;
  onSalvar: (
    funcionarioId: string,
    data: string,
    registroId: string | null,
    payload: { status: PontoStatus; motivo: string | null; obraId: string | null; obraTexto: string | null; observacao: string | null },
  ) => void;
  onLimpar: (registroId: string) => void;
}

export default function PontoTab({
  funcionarios, obras, registros, dias, isLoading, canEdit, saving,
  isAdmin, ancora, savingAncora, onAnterior, onProxima, onHoje, onSalvarAncora,
  onSalvar, onLimpar,
}: Props) {
  const [selecionada, setSelecionada] = useState<CelulaSelecionada | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [ancoraDraft, setAncoraDraft] = useState(ancora ?? '');

  const ativos = useMemo(() => funcionarios.filter((f) => f.ativo), [funcionarios]);
  const mapa = useMemo(() => {
    const m = new Map<string, PontoRegistro>();
    registros.forEach((r) => m.set(`${r.funcionario_id}|${r.data}`, r));
    return m;
  }, [registros]);

  const nomeObraDia = (obraId: string | null, obraTexto: string | null) =>
    obraId ? obras.find((o) => o.id === obraId)?.nome ?? 'Obra' : obraTexto || 'Avulsa';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAnterior}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <span className="px-3 py-1.5 rounded-md bg-muted font-semibold text-sm tabular-nums">
          {rotuloCiclo(dias)}
        </span>
        <Button variant="outline" size="sm" onClick={onProxima}>
          Próxima <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onHoje}>Hoje</Button>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            title="Configurar data-âncora do ciclo"
            onClick={() => { setAncoraDraft(ancora ?? ''); setConfigOpen(true); }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Ciclo de pagamento</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ancora-ciclo">Data de início do ciclo</Label>
            <Input id="ancora-ciclo" type="date" value={ancoraDraft} onChange={(e) => setAncoraDraft(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Mudar essa data desloca todos os ciclos futuros; fechamentos já feitos não são afetados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button
              disabled={!ancoraDraft || savingAncora}
              onClick={() => { onSalvarAncora(ancoraDraft); setConfigOpen(false); }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : ativos.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhum funcionário ativo.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-card z-10 text-left px-3 py-2 border-b min-w-[160px]">Funcionário</th>
                  {dias.map((d) => {
                    const dt = parseISODate(d);
                    const fds = dt.getDay() === 0 || dt.getDay() === 6;
                    return (
                      <th key={d} className={`px-1 py-2 border-b text-center font-medium ${fds ? 'text-muted-foreground/50' : ''}`}>
                        <div>{String(dt.getDate()).padStart(2, '0')}</div>
                        <div className="text-[10px] font-normal">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][dt.getDay()]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ativos.map((f) => (
                  <tr key={f.id} className="border-b last:border-b-0">
                    <td className="sticky left-0 bg-card z-10 px-3 py-1.5 font-medium whitespace-nowrap">
                      {f.nome}
                      {f.funcao && <span className="block text-[10px] text-muted-foreground">{f.funcao}</span>}
                    </td>
                    {dias.map((d) => {
                      const c = resolverCelula(f, d, mapa.get(`${f.id}|${d}`));
                      const dt = parseISODate(d);
                      const fds = dt.getDay() === 0 || dt.getDay() === 6;

                      let classe = 'bg-muted/30 text-muted-foreground/60';
                      let conteudo = '·';
                      let titulo = 'Não aplicável';

                      if (c.status === 'integral' || c.status === 'meio') {
                        const nome = nomeObraDia(c.obraId, c.obraTexto);
                        conteudo = siglaObra(nome);
                        titulo = `${c.status === 'meio' ? 'Meio dia' : 'Integral'} — ${nome}`;
                        classe = c.status === 'meio'
                          ? 'bg-amber-500 text-white'
                          : corDaObra(c.obraId ?? c.obraTexto, obras);
                      } else if (c.status === 'falta') {
                        conteudo = (c.motivo?.[0] ?? 'F').toUpperCase();
                        titulo = `Falta — ${c.motivo ?? 'sem motivo'}`;
                        classe = 'bg-red-600 text-white';
                      }

                      return (
                        <td key={d} className="p-0.5 text-center">
                          <button
                            type="button"
                            title={titulo}
                            disabled={!canEdit}
                            onClick={() => setSelecionada({ funcionarioId: f.id, funcionarioNome: f.nome, data: d, celula: c })}
                            className={`w-7 h-7 rounded text-[10px] font-semibold transition hover:ring-2 hover:ring-ring ${classe} ${fds ? 'opacity-60' : ''} ${c.implicito && c.status !== 'na' ? 'opacity-70' : ''}`}
                          >
                            {conteudo}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 text-xs items-center">
          <span className="font-semibold">Legenda:</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-sky-600 inline-block" /> Integral (cor por obra, sigla de 2 letras)</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-500 inline-block" /> Meio dia</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-600 inline-block" /> Falta (inicial do motivo)</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-muted inline-block" /> Não aplicável (fora dos dias padrão)</span>
          <span className="text-muted-foreground">Células mais claras = presença implícita (sem registro manual).</span>
        </CardContent>
      </Card>

      <PontoCelulaDialog
        selecionada={selecionada}
        obras={obras}
        saving={saving}
        onClose={() => setSelecionada(null)}
        onSave={(payload) => {
          if (!selecionada) return;
          onSalvar(selecionada.funcionarioId, selecionada.data, selecionada.celula.registro?.id ?? null, payload);
          setSelecionada(null);
        }}
        onLimpar={(id) => { onLimpar(id); setSelecionada(null); }}
      />
    </div>
  );
}
