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

export default function NovaObraDialog({ open, onOpenChange, onCreated }: Props) {
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('clientes').select('id, nome').order('nome').then(({ data }) => {
        setClientes(data || []);
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('obras').insert({
      nome,
      endereco: endereco || null,
      responsavel: responsavel || null,
      cliente_id: clienteId || null,
    });
    setLoading(false);
    if (error) {
      toast.error('Erro ao criar obra: ' + error.message);
    } else {
      toast.success('Obra criada!');
      setNome(''); setEndereco(''); setResponsavel(''); setClienteId('');
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Nova Obra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da Obra *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Obra'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
