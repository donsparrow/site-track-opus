import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AditivoFormData } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AditivoFormData;
  setForm: React.Dispatch<React.SetStateAction<AditivoFormData>>;
  onSave: () => void;
}

export default function AditivoDialog({ open, onOpenChange, form, setForm, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Aditivo de Prazo / Escopo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Recuperação estrutural adicional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dias Adicionais (úteis)</Label>
              <Input type="number" min={0} value={form.dias_adicionais} onChange={e => setForm(f => ({ ...f, dias_adicionais: Math.max(0, Number(e.target.value)) }))} />
            </div>
            <div>
              <Label>Data de Aprovação</Label>
              <Input type="date" value={form.data_aprovacao} onChange={e => setForm(f => ({ ...f, data_aprovacao: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Responsável pela Aprovação</Label>
            <Input value={form.responsavel_aprovacao} onChange={e => setForm(f => ({ ...f, responsavel_aprovacao: e.target.value }))} />
          </div>
          <div>
            <Label>Justificativa</Label>
            <Textarea rows={3} value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} />
          </div>
          <div>
            <Label>URL do Documento de Aprovação (opcional)</Label>
            <Input value={form.documento_url} onChange={e => setForm(f => ({ ...f, documento_url: e.target.value }))} placeholder="https://..." />
          </div>
          <p className="text-xs text-muted-foreground">
            Após registrar o aditivo, crie as atividades correspondentes marcando-as como tipo <strong>Aditivo</strong>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave}>Salvar Aditivo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
