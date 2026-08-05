import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormaPagamentoSelect from './FormaPagamentoSelect';
import type { DespesaComObra } from '../types';

export interface EditarDespesaValues {
  valor: number;
  descricao: string;
  data: string;
  tipo: string;
  forma_pagamento: string | null;
  tipo_pagamento: string;
  data_vencimento: string | null;
}

interface Props {
  despesa: DespesaComObra | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EditarDespesaValues) => void;
}

export default function EditarDespesaDialog({ despesa, open, onOpenChange, onSubmit }: Props) {
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState('');
  const [formaPgto, setFormaPgto] = useState('pix');
  const [tipoPgto, setTipoPgto] = useState('avista');
  const [dataVencimento, setDataVencimento] = useState('');

  useEffect(() => {
    if (!despesa) return;
    setValor(String(despesa.valor));
    setDescricao(despesa.descricao);
    setData(despesa.data);
    setTipo(despesa.tipo);
    setFormaPgto(despesa.forma_pagamento || 'pix');
    setTipoPgto(despesa.tipo_pagamento || 'avista');
    setDataVencimento(despesa.data_vencimento || '');
  }, [despesa]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Editar Despesa</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              valor: parseFloat(valor),
              descricao,
              data,
              tipo,
              forma_pagamento: formaPgto || null,
              tipo_pagamento: tipoPgto,
              data_vencimento: tipoPgto === 'prazo' ? dataVencimento : null,
            });
          }}
        >
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
          <div><Label>Descrição</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
          <div><Label>Data da Compra</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} required /></div>
          <div>
            <Label>Tipo de Pagamento</Label>
            <Select value={tipoPgto} onValueChange={setTipoPgto}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avista">À Vista</SelectItem>
                <SelectItem value="prazo">A Prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tipoPgto === 'prazo' && (
            <div><Label>Data de Vencimento</Label><Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required /></div>
          )}
          <FormaPagamentoSelect value={formaPgto || 'pix'} onChange={setFormaPgto} />
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
