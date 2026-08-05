import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReceitaComObra } from '../types';

interface Props {
  receita: ReceitaComObra | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { descricao: string; valor_total: number; observacoes: string | null }) => void;
}

export default function EditarReceitaDialog({ receita, open, onOpenChange, onSubmit }: Props) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (!receita) return;
    setDescricao(receita.descricao);
    setValor(String(receita.valor_total));
    setObservacoes(receita.observacoes || '');
  }, [receita]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Editar Receita</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ descricao, valor_total: parseFloat(valor), observacoes: observacoes || null });
          }}
        >
          <div><Label>Descrição</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
          <div><Label>Valor Total (R$)</Label><Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
          <div><Label>Observações</Label><Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
