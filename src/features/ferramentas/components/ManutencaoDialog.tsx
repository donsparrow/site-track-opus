import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { ManutencaoFormValues } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ManutencaoFormValues) => void;
  saving: boolean;
}

export default function ManutencaoDialog({ open, onOpenChange, onSubmit, saving }: Props) {
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState('');
  const [local, setLocal] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setData(new Date().toISOString().split('T')[0]);
      setValor('');
      setLocal('');
      setAnexo(null);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!valor) {
      toast.error('Informe o valor da manutenção');
      return;
    }
    onSubmit({ data, valor, local, anexo });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Manutenção</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Local / Empresa</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Nome da empresa ou loja" />
          </div>
          <div className="space-y-2">
            <Label>Anexo (Nota Fiscal)</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setAnexo(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Wrench className="h-4 w-4 mr-2" /> {saving ? 'Registrando...' : 'Registrar Manutenção'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
