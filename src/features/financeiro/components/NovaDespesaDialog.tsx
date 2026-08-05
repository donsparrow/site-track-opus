import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, X } from 'lucide-react';
import FormaPagamentoSelect from './FormaPagamentoSelect';
import { useObrasFinanceiro } from '../hooks/useObrasFinanceiro';
import { useFinanceiroMutations } from '../hooks/useFinanceiroMutations';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovaDespesaDialog({ open, onOpenChange }: Props) {
  const { obras } = useObrasFinanceiro();
  const { criarDespesa } = useFinanceiroMutations();

  const [obraId, setObraId] = useState('');
  const [tipo, setTipo] = useState('outros');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [tipoPagamento, setTipoPagamento] = useState('avista');
  const [dataVencimento, setDataVencimento] = useState('');
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    criarDespesa.mutate(
      {
        payload: {
          obra_id: obraId,
          tipo,
          descricao,
          valor: parseFloat(valor),
          data,
          forma_pagamento: formaPagamento || null,
          tipo_pagamento: tipoPagamento,
          data_vencimento: tipoPagamento === 'prazo' ? dataVencimento : null,
        },
        anexoFile,
      },
      {
        onSuccess: () => {
          setDescricao(''); setValor(''); setObraId(''); setAnexoFile(null);
          setTipoPagamento('avista'); setDataVencimento('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Nova Despesa</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Obra *</Label>
            <Select value={obraId} onValueChange={setObraId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
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
          <div><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
          <div><Label>Data da Compra</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div>
            <Label>Tipo de Pagamento</Label>
            <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avista">À Vista</SelectItem>
                <SelectItem value="prazo">A Prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tipoPagamento === 'prazo' && (
            <div>
              <Label>Data de Vencimento *</Label>
              <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
            </div>
          )}
          <FormaPagamentoSelect value={formaPagamento} onChange={setFormaPagamento} />
          <div>
            <Label>Anexo (PDF, JPG, PNG)</Label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => setAnexoFile(e.target.files?.[0] || null)} />
            <div className="flex items-center gap-2 mt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-1" /> Anexar arquivo
              </Button>
              {anexoFile && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  {anexoFile.name}
                  <button type="button" onClick={() => setAnexoFile(null)}><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={criarDespesa.isPending || !obraId || (tipoPagamento === 'prazo' && !dataVencimento)}>
            {criarDespesa.isPending ? 'Salvando...' : 'Registrar Despesa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
