import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { TIPOS_LANCAMENTO, type Funcionario, type Lancamento } from '../types';
import { parseISODate, toISODate } from '../utils';
import type { LancamentoFormValues } from '../hooks/useLancamentos';

const TODOS = '__todos__';
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  funcionarios: Funcionario[];
  lancamentos: Lancamento[];
  isLoading: boolean;
  canEdit: boolean;
  saving: boolean;
  filtroFuncionario: string | null;
  inicio: string;
  fim: string;
  onChangeFiltro: (funcionarioId: string | null) => void;
  onChangePeriodo: (inicio: string, fim: string) => void;
  onSave: (values: LancamentoFormValues) => void;
  onDelete: (id: string) => void;
}

export default function LancamentosTab({
  funcionarios, lancamentos, isLoading, canEdit, saving,
  filtroFuncionario, inicio, fim, onChangeFiltro, onChangePeriodo, onSave, onDelete,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [data, setData] = useState(toISODate(new Date()));
  const [tipo, setTipo] = useState('vale');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');

  const nome = (id: string) => funcionarios.find((f) => f.id === id)?.nome ?? '—';
  const total = lancamentos.reduce((acc, l) => {
    const sinal = TIPOS_LANCAMENTO.find((t) => t.valor === l.tipo)?.sinal ?? -1;
    return acc + sinal * Number(l.valor);
  }, 0);

  const submit = () => {
    if (!funcionarioId || !valor) return;
    onSave({ funcionario_id: funcionarioId, data, tipo, valor: Number(valor), descricao });
    setValor(''); setDescricao(''); setAberto(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Funcionário</Label>
          <Select
            value={filtroFuncionario ?? TODOS}
            onValueChange={(v) => onChangeFiltro(v === TODOS ? null : v)}
          >
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" className="w-[160px]" value={inicio} onChange={(e) => onChangePeriodo(e.target.value, fim)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" className="w-[160px]" value={fim} onChange={(e) => onChangePeriodo(inicio, e.target.value)} />
        </div>
        {canEdit && (
          <Button className="ml-auto" onClick={() => setAberto((v) => !v)}>
            <Plus className="h-4 w-4 mr-2" /> Novo lançamento
          </Button>
        )}
      </div>

      {aberto && canEdit && (
        <Card>
          <CardContent className="p-4 grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Funcionário</Label>
              <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_LANCAMENTO.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="md:col-span-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving || !funcionarioId || !valor}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : lancamentos.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhum lançamento no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{parseISODate(l.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-medium">{nome(l.funcionario_id)}</TableCell>
                    <TableCell>
                      <Badge variant={l.tipo === 'bonus' ? 'default' : 'secondary'} className="capitalize">
                        {TIPOS_LANCAMENTO.find((t) => t.valor === l.tipo)?.label ?? l.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.descricao || '—'}</TableCell>
                    <TableCell className="text-right">{brl(Number(l.valor))}</TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => onDelete(l.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {lancamentos.length > 0 && (
        <p className="text-sm text-muted-foreground text-right">
          Efeito líquido no período: <span className="font-semibold text-foreground">{brl(total)}</span>
        </p>
      )}
    </div>
  );
}
