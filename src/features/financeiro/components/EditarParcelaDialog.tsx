import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormaPagamentoSelect from './FormaPagamentoSelect';
import type { Parcela } from '../types';

interface Props {
  parcela: Parcela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { valor: number; data_vencimento: string; forma_pagamento: string | null }) => void;
}

export default function EditarParcelaDialog({ parcela, open, onOpenChange, onSubmit }: Props) {
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [formaPgto, setFormaPgto] = useState('pix');

  useEffect(() => {
    if (!parcela) return;
    setValor(String(parcela.valor));
    setVencimento(parcela.data_vencimento);
    setFormaPgto(parcela.forma_pagamento || 'pix');
  }, [parcela]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Editar Parcela</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ valor: parseFloat(valor), data_vencimento: vencimento, forma_pagamento: formaPgto || null });
          }}
        >
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
          <div><Label>Data de Vencimento</Label><Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required /></div>
          <FormaPagamentoSelect value={formaPgto} onChange={setFormaPgto} />
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
