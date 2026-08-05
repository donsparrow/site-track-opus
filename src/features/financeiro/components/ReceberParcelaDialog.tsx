import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FormaPagamentoSelect from './FormaPagamentoSelect';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (formaPagamento: string) => void;
}

export default function ReceberParcelaDialog({ open, onOpenChange, onConfirm }: Props) {
  const [formaPgto, setFormaPgto] = useState('pix');

  useEffect(() => { if (open) setFormaPgto('pix'); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Receber Parcela</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormaPagamentoSelect value={formaPgto} onChange={setFormaPgto} />
          <p className="text-sm text-muted-foreground">A data de recebimento será preenchida com a data de hoje.</p>
          <Button onClick={() => onConfirm(formaPgto)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            Confirmar Recebimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
