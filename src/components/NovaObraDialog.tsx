import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

function calcBizDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function NovaObraDialog({ open, onOpenChange, onCreated }: Props) {
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [creaCau, setCreaCau] = useState('');

  const [clienteId, setClienteId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFimPrevista, setDataFimPrevista] = useState('');
  const [status, setStatus] = useState('planejamento');
  const [prazoContratual, setPrazoContratual] = useState(0);
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
    if (!nome || !endereco || !responsavel || !dataInicio || !dataFimPrevista) {
      toast.error('Preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('obras').insert({
      nome,
      endereco,
      responsavel_tecnico: responsavel,
      crea_cau: creaCau || null,
      cliente_id: clienteId || null,
      data_inicio: dataInicio,
      data_fim_prevista: dataFimPrevista,
      prazo_contratual_dias: prazoContratual || 0,
      status,
    });
    setLoading(false);
    if (error) {
      toast.error('Erro ao criar obra: ' + error.message);
    } else {
      toast.success('Obra criada!');
      setNome(''); setEndereco(''); setResponsavel(''); setCreaCau(''); setClienteId('');
      setDataInicio(''); setDataFimPrevista(''); setStatus('planejamento'); setPrazoContratual(0);
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável Técnico</Label>
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejamento">Planejamento</SelectItem>
                  <SelectItem value="andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <div>
            <Label>CREA/CAU</Label>
            <Input value={creaCau} onChange={(e) => setCreaCau(e.target.value)} placeholder="Ex: CREA-MG 123456/D" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Início *</Label>
              <Input type="date" value={dataInicio} onChange={(e) => {
                setDataInicio(e.target.value);
                if (e.target.value && dataFimPrevista) {
                  setPrazoContratual(calcBizDays(e.target.value, dataFimPrevista));
                }
              }} required />
            </div>
            <div>
              <Label>Previsão de Término *</Label>
              <Input type="date" value={dataFimPrevista} onChange={(e) => {
                setDataFimPrevista(e.target.value);
                if (dataInicio && e.target.value) {
                  setPrazoContratual(calcBizDays(dataInicio, e.target.value));
                }
              }} required />
            </div>
          </div>
          <div>
            <Label>Prazo Contratual (dias úteis)</Label>
            <Input type="number" min={1} value={prazoContratual || ''} onChange={(e) => setPrazoContratual(parseInt(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente, mas pode ser ajustado.</p>
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Obra'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
