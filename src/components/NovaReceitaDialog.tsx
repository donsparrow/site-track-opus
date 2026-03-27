import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Paperclip, X } from 'lucide-react';

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
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      supabase.from('obras').select('id, nome').order('nome').then(({ data }) => setObras(data || []));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let anexoUrl: string | null = null;
    if (anexoFile) {
      const ext = anexoFile.name.split('.').pop();
      const path = `receitas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('anexos').upload(path, anexoFile);
      if (upErr) { toast.error('Erro ao enviar arquivo: ' + upErr.message); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(path);
      anexoUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('receitas').insert({
      obra_id: obraId,
      descricao,
      valor_total: parseFloat(valorTotal),
      forma_pagamento: formaPagamento as 'avista' | 'parcelado',
      numero_parcelas: formaPagamento === 'parcelado' ? parseInt(numeroParcelas) : 1,
      observacoes: observacoes || null,
      anexo: anexoUrl,
    } as any);
    setLoading(false);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Receita criada! Parcelas geradas automaticamente.');
      setDescricao(''); setValorTotal(''); setObraId(''); setObservacoes(''); setAnexoFile(null);
      onOpenChange(false);
      onCreated();
    }
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
          <div>
            <Label>Anexo (PDF, JPG, PNG)</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => setAnexoFile(e.target.files?.[0] || null)}
            />
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
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading || !obraId}>
            {loading ? 'Criando...' : 'Criar Receita'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
