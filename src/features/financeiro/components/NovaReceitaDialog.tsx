import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, X } from 'lucide-react';
import { useObrasFinanceiro } from '../hooks/useObrasFinanceiro';
import { useFinanceiroMutations } from '../hooks/useFinanceiroMutations';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovaReceitaDialog({ open, onOpenChange }: Props) {
  const { obras } = useObrasFinanceiro();
  const { criarReceita } = useFinanceiroMutations();

  const [obraId, setObraId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('avista');
  const [numeroParcelas, setNumeroParcelas] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    criarReceita.mutate(
      {
        payload: {
          obra_id: obraId,
          descricao,
          valor_total: parseFloat(valorTotal),
          forma_pagamento: formaPagamento,
          numero_parcelas: formaPagamento === 'parcelado' ? parseInt(numeroParcelas) : 1,
          observacoes: observacoes || null,
        },
        anexoFile,
      },
      {
        onSuccess: () => {
          setDescricao(''); setValorTotal(''); setObraId(''); setObservacoes(''); setAnexoFile(null);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Nova Receita</DialogTitle></DialogHeader>
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
          <div><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
          <div><Label>Valor Total (R$) *</Label><Input type="number" step="0.01" min="0" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} required /></div>
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
              <Input type="number" min="2" value={numeroParcelas} onChange={(e) => setNumeroParcelas(e.target.value)} />
            </div>
          )}
          <div><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
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
            disabled={criarReceita.isPending || !obraId}>
            {criarReceita.isPending ? 'Criando...' : 'Criar Receita'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
