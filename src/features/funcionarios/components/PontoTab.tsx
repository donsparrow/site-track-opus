import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Funcionario, ObraOption, PontoRegistro, PontoStatus } from '../types';
import { corDaObra, parseISODate, resolverCelula, siglaObra } from '../utils';
import PontoCelulaDialog, { type CelulaSelecionada } from './PontoCelulaDialog';

interface Props {
  funcionarios: Funcionario[];
  obras: ObraOption[];
  registros: PontoRegistro[];
  dias: string[];
  ano: number;
  mes: number;
  quinzena: 1 | 2;
  isLoading: boolean;
  canEdit: boolean;
  saving: boolean;
  onChangePeriodo: (ano: number, mes: number, quinzena: 1 | 2) => void;
  onSalvar: (
    funcionarioId: string,
    data: string,
    registroId: string | null,
    payload: { status: PontoStatus; motivo: string | null; obraId: string | null; obraTexto: string | null; observacao: string | null },
  ) => void;
  onLimpar: (registroId: string) => void;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function PontoTab({
  funcionarios, obras, registros, dias, ano, mes, quinzena, isLoading, canEdit, saving,
  onChangePeriodo, onSalvar, onLimpar,
}: Props) {
  const [selecionada, setSelecionada] = useState<CelulaSelecionada | null>(null);

  const ativos = useMemo(() => funcionarios.filter((f) => f.ativo), [funcionarios]);
  const mapa = useMemo(() => {
    const m = new Map<string, PontoRegistro>();
    registros.forEach((r) => m.set(`${r.funcionario_id}|${r.data}`, r));
    return m;
  }, [registros]);

  const nomeObraDia = (obraId: string | null, obraTexto: string | null) =>
    obraId ? obras.find((o) => o.id === obraId)?.nome ?? 'Obra' : obraTexto || 'Avulsa';

  const anos = [ano - 1, ano, ano + 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={String(mes)} onValueChange={(v) => onChangePeriodo(ano, Number(v), quinzena)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(ano)} onValueChange={(v) => onChangePeriodo(Number(v), mes, quinzena)}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant={quinzena === 1 ? 'default' : 'outline'} onClick={() => onChangePeriodo(ano, mes, 1)}>1ª quinzena (1–15)</Button>
          <Button variant={quinzena === 2 ? 'default' : 'outline'} onClick={() => onChangePeriodo(ano, mes, 2)}>2ª quinzena (16–fim)</Button>
        </div>
      </div>

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
