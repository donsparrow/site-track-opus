import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormaPagamentoSelect from './FormaPagamentoSelect';
import { useParcelas } from '../hooks/useParcelas';
import { fmt } from '../utils';
import { maximoParcela, somaValores, TOLERANCIA } from '../parcelasCalc';
import type { Parcela } from '../types';

interface Props {
  parcela: Parcela | null;
  /** Valor total da receita dona da parcela (null se desconhecido). */
  valorTotalReceita: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { valor: number; data_vencimento: string; forma_pagamento: string | null }) => void;
}

export default function EditarParcelaDialog({ parcela, valorTotalReceita, open, onOpenChange, onSubmit }: Props) {
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [formaPgto, setFormaPgto] = useState('pix');
  const { parcelas } = useParcelas(parcela?.receita_id ?? null);

  useEffect(() => {
    if (!parcela) return;
    setValor(String(parcela.valor));
    setVencimento(parcela.data_vencimento);
    setFormaPgto(parcela.forma_pagamento || 'pix');
  }, [parcela]);

  const somaDemais = somaValores(parcelas.filter((p) => p.id !== parcela?.id).map((p) => Number(p.valor)));
  const maximo = valorTotalReceita != null ? maximoParcela(valorTotalReceita, somaDemais) : null;
  const v = parseFloat(valor);
  const acima = maximo != null && v > maximo + TOLERANCIA;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Editar Parcela</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (acima || !(v > 0)) return;
            onSubmit({ valor: Math.round(v * 100) / 100, data_vencimento: vencimento, forma_pagamento: formaPgto || null });
          }}
        >
          {maximo != null && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <p>Valor total da receita: <strong className="data-tech">{fmt(valorTotalReceita as number)}</strong></p>
              <p>Soma das demais parcelas: <strong className="data-tech">{fmt(somaDemais)}</strong></p>
              <p>Máximo permitido para esta parcela: <strong className="data-tech">{fmt(maximo)}</strong></p>
            </div>
          )}
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
            {acima && <p className="text-sm text-destructive mt-1">O valor ultrapassa o máximo permitido de {fmt(maximo as number)}.</p>}
          </div>
          <div><Label>Data de Vencimento</Label><Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required /></div>
          <FormaPagamentoSelect value={formaPgto} onChange={setFormaPgto} />
          <Button type="submit" disabled={acima || !(v > 0)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
