import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function NovaReceitaDialog({ open, onOpenChange, onCreated }: Props) {
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [obraId, setObraId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('avista');
  const [numeroParcelas, setNumeroParcelas] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('obras').select('id, nome').order('nome').then(({ data }) => setObras(data || []));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('receitas').insert({
      obra_id: obraId,
      descricao,
      valor_total: parseFloat(valorTotal),
      forma_pagamento: formaPagamento as 'avista' | 'parcelado',
      numero_parcelas: formaPagamento === 'parcelado' ? parseInt(numeroParcelas) : 1,
      observacoes: observacoes || null,
    });
    setLoading(false);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Receita criada! Parcelas geradas automaticamente.');
      setDescricao(''); setValorTotal(''); setObraId(''); setObservacoes('');
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Nova Receita</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Obra *</Label>
            <Select value={obraId} onValueChange={setObraId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input value={descricao} onChange={e => setDescricao(e.target.value)} required />
          </div>
          <div>
            <Label>Valor Total (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={valorTotal} onChange={e => setValorTotal(e.target.value)} required />
          </div>
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
              <Input type="number" min="2" value={numeroParcelas} onChange={e => setNumeroParcelas(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading || !obraId}>
            {loading ? 'Criando...' : 'Criar Receita'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
