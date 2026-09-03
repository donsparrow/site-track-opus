import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Lock, RotateCcw } from 'lucide-react';
import type { Funcionario, Lancamento, ObraOption, PontoRegistro } from '../types';
import { TIPOS_LANCAMENTO } from '../types';
import { parseISODate, resolverCelula } from '../utils';
import type { CriarFechamentoInput, DetalheObra, Fechamento } from '../hooks/useFechamentos';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (s: string) => parseISODate(s).toLocaleDateString('pt-BR');

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface Props {
  funcionarios: Funcionario[];
  obras: ObraOption[];
  registros: PontoRegistro[];
  lancamentos: Lancamento[];
  dias: string[];
  ano: number;
  mes: number;
  quinzena: 1 | 2;
  fechamentos: Fechamento[];
  isLoading: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  saving: boolean;
  funcionarioId: string | null;
  onChangeFuncionario: (id: string | null) => void;
  onChangePeriodo: (ano: number, mes: number, quinzena: 1 | 2) => void;
  onFechar: (input: CriarFechamentoInput) => void;
  onReabrir: (id: string) => void;
}

export default function FechamentosTab({
  funcionarios, obras, registros, lancamentos, dias, ano, mes, quinzena,
  fechamentos, isLoading, canEdit, isAdmin, saving, funcionarioId,
  onChangeFuncionario, onChangePeriodo, onFechar, onReabrir,
}: Props) {
  const [revisando, setRevisando] = useState(false);

  const funcionario = funcionarios.find((f) => f.id === funcionarioId) ?? null;
  const periodoInicio = dias[0];
  const periodoFim = dias[dias.length - 1];

  const resumo = useMemo(() => {
    if (!funcionario) return null;
    const mapa = new Map<string, PontoRegistro>();
    registros
      .filter((r) => r.funcionario_id === funcionario.id)
      .forEach((r) => mapa.set(r.data, r));

    let diasIntegrais = 0;
    let diasMeio = 0;
    const grupos = new Map<string, DetalheObra>();

    dias.forEach((d) => {
      const c = resolverCelula(funcionario, d, mapa.get(d));
      const peso = c.status === 'integral' ? 1 : c.status === 'meio' ? 0.5 : 0;
      if (peso === 0) return;
      if (c.status === 'integral') diasIntegrais += 1; else diasMeio += 1;

      const chave = c.obraId ?? (c.obraTexto ? `t:${c.obraTexto}` : 'sem');
      const nome = c.obraId
        ? obras.find((o) => o.id === c.obraId)?.nome ?? 'Obra'
        : c.obraTexto || 'Sem obra definida';
      const atual = grupos.get(chave) ?? {
        obra_id: c.obraId,
        obra_texto: c.obraId ? null : c.obraTexto,
        obra_nome: nome,
        dias: 0,
        valor: 0,
      };
      atual.dias += peso;
      grupos.set(chave, atual);
    });

    const diaria = Number(funcionario.valor_diaria) || 0;
    const detalhamento = Array.from(grupos.values()).map((g) => ({
      ...g,
      valor: Number((g.dias * diaria).toFixed(2)),
    }));
    const totalDias = diasIntegrais + diasMeio * 0.5;
    const bruto = Number((totalDias * diaria).toFixed(2));
    const naoAlocado = Number(
      detalhamento.filter((d) => !d.obra_id).reduce((a, d) => a + d.valor, 0).toFixed(2),
    );

    const lancPeriodo = lancamentos.filter(
      (l) => l.funcionario_id === funcionario.id && l.data >= periodoInicio && l.data <= periodoFim,
    );
    const descontos = lancPeriodo
      .filter((l) => (TIPOS_LANCAMENTO.find((t) => t.valor === l.tipo)?.sinal ?? -1) === -1)
      .reduce((a, l) => a + Number(l.valor), 0);
    const bonus = lancPeriodo
      .filter((l) => (TIPOS_LANCAMENTO.find((t) => t.valor === l.tipo)?.sinal ?? -1) === 1)
      .reduce((a, l) => a + Number(l.valor), 0);

    return {
      diaria, diasIntegrais, diasMeio, totalDias, bruto, detalhamento,
      naoAlocado, descontos, bonus, lancPeriodo,
      liquido: Number((bruto - descontos + bonus).toFixed(2)),
    };
  }, [funcionario, registros, dias, obras, lancamentos, periodoInicio, periodoFim]);

  const jaFechado = fechamentos.some(
    (f) => f.funcionario_id === funcionarioId && f.periodo_inicio === periodoInicio && f.status === 'fechado',
  );

  const confirmar = () => {
    if (!funcionario || !resumo) return;
    onFechar({
      funcionario_id: funcionario.id,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      valor_diaria_congelado: resumo.diaria,
      dias_integrais: resumo.diasIntegrais,
      dias_meio: resumo.diasMeio,
      total_vales: Number((resumo.descontos - resumo.bonus).toFixed(2)),
      valor_liquido: resumo.liquido,
      valor_nao_alocado: resumo.naoAlocado,
      detalhamento_obras: resumo.detalhamento,
    });
    setRevisando(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Funcionário</Label>
          <Select value={funcionarioId ?? ''} onValueChange={(v) => onChangeFuncionario(v)}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
            <SelectContent>
              {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Select value={String(mes)} onValueChange={(v) => onChangePeriodo(ano, Number(v), quinzena)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(ano)} onValueChange={(v) => onChangePeriodo(Number(v), mes, quinzena)}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>{[ano - 1, ano, ano + 1].map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant={quinzena === 1 ? 'default' : 'outline'} onClick={() => onChangePeriodo(ano, mes, 1)}>1ª quinzena</Button>
          <Button variant={quinzena === 2 ? 'default' : 'outline'} onClick={() => onChangePeriodo(ano, mes, 2)}>2ª quinzena</Button>
        </div>
        <Button
          className="ml-auto"
          disabled={!funcionario || !canEdit || jaFechado}
          onClick={() => setRevisando(true)}
        >
          <Lock className="h-4 w-4 mr-2" /> Fechar quinzena
        </Button>
      </div>

      {jaFechado && (
        <p className="text-sm text-amber-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Esta quinzena já está fechada para o funcionário selecionado.
        </p>
      )}

      {funcionario && resumo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Prévia — {funcionario.nome} · {dataBR(periodoInicio)} a {dataBR(periodoFim)}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4 text-sm">
            <div><p className="text-muted-foreground text-xs">Diária</p><p className="font-semibold">{brl(resumo.diaria)}</p></div>
            <div><p className="text-muted-foreground text-xs">Dias (integrais / meios)</p><p className="font-semibold">{resumo.diasIntegrais} / {resumo.diasMeio}</p></div>
            <div><p className="text-muted-foreground text-xs">Valor bruto</p><p className="font-semibold">{brl(resumo.bruto)}</p></div>
            <div><p className="text-muted-foreground text-xs">Valor líquido</p><p className="font-semibold text-primary">{brl(resumo.liquido)}</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Histórico de fechamentos</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : fechamentos.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhum fechamento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead className="text-right">Não alocado</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fechamentos.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{dataBR(f.periodo_inicio)} – {dataBR(f.periodo_fim)}</TableCell>
                    <TableCell className="font-medium">
                      {funcionarios.find((x) => x.id === f.funcionario_id)?.nome ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">{f.dias_integrais} + {f.dias_meio}½</TableCell>
                    <TableCell className="text-right">{brl(Number(f.valor_nao_alocado))}</TableCell>
                    <TableCell className="text-right font-semibold">{brl(Number(f.valor_liquido))}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === 'fechado' ? 'default' : 'secondary'} className="capitalize">{f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && f.status === 'fechado' && (
                        <Button variant="outline" size="sm" onClick={() => onReabrir(f.id)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reabrir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={revisando} onOpenChange={setRevisando}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisão do fechamento — {funcionario?.nome}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Período {dataBR(periodoInicio)} a {dataBR(periodoFim)} · diária {brl(resumo?.diaria ?? 0)}
            </p>
          </DialogHeader>

          {resumo && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold mb-2">Dias por obra</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obra</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.detalhamento.map((d) => (
                      <TableRow key={`${d.obra_id ?? d.obra_texto ?? 'sem'}`}>
                        <TableCell>
                          {d.obra_nome}
                          {!d.obra_id && <Badge variant="secondary" className="ml-2">não alocado</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{d.dias}</TableCell>
                        <TableCell className="text-right">{brl(d.valor)}</TableCell>
                      </TableRow>
                    ))}
                    {resumo.detalhamento.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum dia trabalhado no período.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-md border p-3 space-y-1">
                <div className="flex justify-between"><span>Valor bruto ({resumo.totalDias} dias)</span><span>{brl(resumo.bruto)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Valor não alocado (sem obra cadastrada)</span><span>{brl(resumo.naoAlocado)}</span></div>
                <div className="flex justify-between"><span>Vales / adiantamentos / descontos</span><span className="text-destructive">- {brl(resumo.descontos)}</span></div>
                <div className="flex justify-between"><span>Bônus</span><span className="text-emerald-600">+ {brl(resumo.bonus)}</span></div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t"><span>Valor líquido</span><span>{brl(resumo.liquido)}</span></div>
              </div>

              <p className="text-xs text-muted-foreground">
                Ao confirmar, o fechamento é congelado e as despesas de mão de obra são lançadas no Financeiro
                de cada obra cadastrada do detalhamento. Trabalhos avulsos entram como valor não alocado.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisando(false)}>Cancelar</Button>
            <Button onClick={confirmar} disabled={saving || !resumo || resumo.detalhamento.length === 0}>
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
