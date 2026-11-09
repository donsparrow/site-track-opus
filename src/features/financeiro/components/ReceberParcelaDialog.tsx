import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormaPagamentoSelect from './FormaPagamentoSelect';
import { hojeISO } from '../parcelasCalc';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (formaPagamento: string, dataRecebimento: string) => void;
}

export default function ReceberParcelaDialog({ open, onOpenChange, onConfirm }: Props) {
  const [formaPgto, setFormaPgto] = useState('pix');
  const [data, setData] = useState(hojeISO());
  const hoje = hojeISO();

  useEffect(() => {
    if (open) { setFormaPgto('pix'); setData(hojeISO()); }
  }, [open]);

  const futura = !data || data > hoje;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Receber Parcela</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormaPagamentoSelect value={formaPgto} onChange={setFormaPgto} />
          <div>
            <Label>Data do pagamento</Label>
            <Input type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            {data > hoje && <p className="text-sm text-destructive mt-1">A data do pagamento não pode ser futura.</p>}
          </div>
          <Button disabled={futura} onClick={() => onConfirm(formaPgto, data)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            Confirmar Recebimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
