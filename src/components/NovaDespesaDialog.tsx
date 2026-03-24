import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function NovaDespesaDialog({ open, onOpenChange, onCreated }: Props) {
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [obraId, setObraId] = useState('');
  const [tipo, setTipo] = useState('outros');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('obras').select('id, nome').order('nome').then(({ data }) => setObras(data || []));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('despesas').insert({
      obra_id: obraId,
      tipo,
      descricao,
      valor: parseFloat(valor),
      data,
      forma_pagamento: formaPagamento || null,
    });
    setLoading(false);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Despesa registrada!');
      setDescricao(''); setValor(''); setObraId('');
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Nova Despesa</DialogTitle></DialogHeader>
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
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="mao_obra">Mão de Obra</SelectItem>
                <SelectItem value="ferramenta">Ferramenta</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input value={descricao} onChange={e => setDescricao(e.target.value)} required />
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} required />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Input value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} placeholder="Ex: Pix, Cartão..." />
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading || !obraId}>
            {loading ? 'Salvando...' : 'Registrar Despesa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
