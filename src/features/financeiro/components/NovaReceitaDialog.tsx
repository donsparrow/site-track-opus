import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, X } from 'lucide-react';
import { useObrasFinanceiro } from '../hooks/useObrasFinanceiro';
import { useFinanceiroMutations } from '../hooks/useFinanceiroMutations';
import { fmt } from '../utils';
import { gerarParcelas, somaValores, TOLERANCIA } from '../parcelasCalc';

interface LinhaParcela { valor: string; data_vencimento: string }

const gerarLinhas = (total: number, n: number): LinhaParcela[] =>
  gerarParcelas(total, n).map((p) => ({ valor: p.valor.toFixed(2), data_vencimento: p.data_vencimento }));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovaReceitaDialog({ open, onOpenChange }: Props) {
  const { obras } = useObrasFinanceiro();
  const { criarReceita } = useFinanceiroMutations();

  const [obraId, setObraId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('avista');
  const [numeroParcelas, setNumeroParcelas] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [tipoAnexo, setTipoAnexo] = useState('nota_fiscal');
  const fileRef = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<LinhaParcela[]>([]);
  const [editado, setEditado] = useState(false);
  // Chave de envio: a mesma em todas as tentativas deste formulário; evita receita duplicada.
  const [chaveEnvio, setChaveEnvio] = useState(() => crypto.randomUUID());
  useEffect(() => { if (open) setChaveEnvio(crypto.randomUUID()); }, [open]);

  const total = parseFloat(valorTotal);
  const n = formaPagamento === 'parcelado' ? parseInt(numeroParcelas) : 1;
  const podeGerar = total > 0 && n >= 1;

  // Recalcula sozinho enquanto o usuário não editou nenhuma linha.
  useEffect(() => {
    if (editado) return;
    setLinhas(podeGerar ? gerarLinhas(total, n) : []);
  }, [total, n, podeGerar, editado]);

  const soma = useMemo(() => somaValores(linhas.map((l) => parseFloat(l.valor) || 0)), [linhas]);
  const diferenca = podeGerar ? Math.round((soma - total) * 100) / 100 : 0;
  const linhasValidas = linhas.length > 0 && linhas.every((l) => parseFloat(l.valor) > 0 && l.data_vencimento);
  const fechado = podeGerar && Math.abs(diferenca) <= TOLERANCIA && linhasValidas;

  const editarLinha = (i: number, campo: keyof LinhaParcela, valor: string) => {
    setEditado(true);
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  };

  const recalcular = () => {
    setEditado(false);
    setLinhas(podeGerar ? gerarLinhas(total, n) : []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechado || criarReceita.isPending) return;
    criarReceita.mutate(
      {
        payload: {
          obra_id: obraId,
          descricao,
          valor_total: total,
          forma_pagamento: formaPagamento,
          observacoes: observacoes || null,
        },
        parcelas: linhas.map((l) => ({
          valor: Math.round(parseFloat(l.valor) * 100) / 100,
          data_vencimento: l.data_vencimento,
        })),
        anexoFile,
        tipoAnexo,
        chaveEnvio,
      },
      {
        onSuccess: () => {
          setDescricao(''); setValorTotal(''); setObraId(''); setObservacoes(''); setAnexoFile(null); setTipoAnexo('nota_fiscal');
          setFormaPagamento('avista'); setNumeroParcelas('1'); setEditado(false);
          setChaveEnvio(crypto.randomUUID());
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Nova Receita</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Obra *</Label>
            <Select value={obraId} onValueChange={setObraId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
          <div><Label>Valor Total (R$) *</Label><Input type="number" step="0.01" min="0" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} required /></div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avista">À Vista</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formaPagamento === 'parcelado' && (
            <div>
              <Label>Número de Parcelas</Label>
              <Input type="number" min="2" value={numeroParcelas} onChange={(e) => setNumeroParcelas(e.target.value)} />
            </div>
          )}
          {linhas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Parcelas</Label>
                {editado && (
                  <Button type="button" variant="outline" size="sm" onClick={recalcular}>Recalcular parcelas</Button>
                )}
              </div>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left w-10">Nº</th>
                      <th className="p-2 text-left">Vencimento</th>
                      <th className="p-2 text-left">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 data-tech">{i + 1}</td>
                        <td className="p-1">
                          <Input type="date" value={l.data_vencimento} aria-label={`Vencimento da parcela ${i + 1}`}
                            onChange={(e) => editarLinha(i, 'data_vencimento', e.target.value)} />
                        </td>
                        <td className="p-1">
                          <Input type="number" step="0.01" min="0.01" value={l.valor} aria-label={`Valor da parcela ${i + 1}`}
                            onChange={(e) => editarLinha(i, 'valor', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={`border-t p-2 text-sm space-y-1 ${diferenca > TOLERANCIA ? 'bg-destructive/10 text-destructive' : diferenca < -TOLERANCIA ? 'bg-warning/10 text-warning' : 'bg-muted/30'}`}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Soma das parcelas: <strong className="data-tech">{fmt(soma)}</strong></span>
                    <span>Valor total: <strong className="data-tech">{fmt(total)}</strong></span>
                    <span>Diferença: <strong className="data-tech">{fmt(diferenca)}</strong></span>
                  </div>
                  {diferenca > TOLERANCIA && <p className="font-medium">A soma ultrapassa o valor total em {fmt(diferenca)}</p>}
                  {diferenca < -TOLERANCIA && <p className="font-medium">Faltam {fmt(-diferenca)} para fechar o valor total</p>}
                </div>
              </div>
            </div>
          )}
          <div><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
          <div>
            <Label>Anexo (PDF, JPG, PNG)</Label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => setAnexoFile(e.target.files?.[0] || null)} />
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-1" /> Anexar arquivo
              </Button>
              {anexoFile && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  {anexoFile.name}
                  <button type="button" onClick={() => { setAnexoFile(null); setTipoAnexo('nota_fiscal'); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              {anexoFile && (
                <Select value={tipoAnexo} onValueChange={setTipoAnexo}>
                  <SelectTrigger className="w-40" aria-label="Tipo do anexo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={criarReceita.isPending || !obraId || !fechado}>
            {criarReceita.isPending ? 'Criando...' : 'Criar Receita'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
