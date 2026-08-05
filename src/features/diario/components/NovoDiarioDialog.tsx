import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DiarioFormValues } from '../types';

const initialValues = (): DiarioFormValues => ({
  data: new Date().toISOString().split('T')[0],
  clima: 'sol',
  temperatura: '',
  horario_inicio: '07:00',
  horario_fim: '17:00',
  observacoes_gerais: '',
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSubmit: (values: DiarioFormValues) => void;
}

export function NovoDiarioDialog({ open, onOpenChange, saving, onSubmit }: Props) {
  const [form, setForm] = useState<DiarioFormValues>(initialValues);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) setForm(initialValues()); }}
    >
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Novo Diário de Obra</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
          className="space-y-4"
        >
          <div>
            <Label>Data *</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          </div>
          <div>
            <Label>Clima</Label>
            <Select value={form.clima} onValueChange={(v) => setForm({ ...form, clima: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sol">☀️ Sol</SelectItem>
                <SelectItem value="nublado">☁️ Nublado</SelectItem>
                <SelectItem value="chuva">🌧️ Chuva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Temperatura</Label>
              <Input placeholder="Ex: 28°C" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Horário Início</Label>
              <Input type="time" value={form.horario_inicio} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} />
            </div>
            <div>
              <Label>Horário Fim</Label>
              <Input type="time" value={form.horario_fim} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Observações Gerais</Label>
            <Textarea value={form.observacoes_gerais} onChange={(e) => setForm({ ...form, observacoes_gerais: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? 'Criando...' : 'Criar Diário'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
