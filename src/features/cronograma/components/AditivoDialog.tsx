import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AditivoAtividadeForm, AditivoFormData } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AditivoFormData;
  setForm: React.Dispatch<React.SetStateAction<AditivoFormData>>;
  onSave: () => void;
  editing?: boolean;
  saving?: boolean;
}

const NOVA_LINHA: AditivoAtividadeForm = { nome_atividade: '', peso: 0, data_inicio: '', data_fim: '' };

export default function AditivoDialog({ open, onOpenChange, form, setForm, onSave, editing, saving }: Props) {
  const pesoTotal = (form.atividades ?? []).reduce((s, a) => s + (Number(a.peso) || 0), 0);
  const pesoOk = pesoTotal === 100;

  const updLinha = (i: number, patch: Partial<AditivoAtividadeForm>) =>
    setForm(f => ({ ...f, atividades: (f.atividades ?? []).map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  const addLinha = () => setForm(f => ({ ...f, atividades: [...(f.atividades ?? []), { ...NOVA_LINHA }] }));
  const rmLinha = (i: number) => setForm(f => ({ ...f, atividades: (f.atividades ?? []).filter((_, idx) => idx !== i) }));

  return (
    <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Aditivo de Prazo / Escopo' : 'Registrar Aditivo de Prazo / Escopo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Recuperação estrutural adicional" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Dias Adicionais (úteis) *</Label>
              <Input
                type="number" min={1} placeholder="Ex.: 10"
                value={form.dias_adicionais}
                onChange={e => setForm(f => ({ ...f, dias_adicionais: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
              />
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

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold">Atividades deste aditivo</Label>
              {(form.atividades ?? []).length > 0 && (
                <span className={`text-xs font-medium ${pesoOk ? 'text-primary' : 'text-destructive'}`}>
                  Peso do aditivo: {pesoTotal}% {pesoOk ? '✓' : '(recomendado: 100%)'}
                </span>
              )}
            </div>
            {(form.atividades ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma atividade. Adicione os serviços que fazem parte deste aditivo.</p>
            )}
            {(form.atividades ?? []).map((a, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4">
                  {i === 0 && <Label className="text-xs">Atividade</Label>}
                  <Input value={a.nome_atividade} onChange={e => updLinha(i, { nome_atividade: e.target.value })} placeholder="Nome da atividade" />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Label className="text-xs" htmlFor={`aditivo-peso-${i}`}>Peso (%)</Label>
                  <Input id={`aditivo-peso-${i}`} placeholder="Peso (%)" type="number" min={0} max={100} value={a.peso} onChange={e => updLinha(i, { peso: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  {i === 0 && <Label className="text-xs">Início</Label>}
                  <Input type="date" value={a.data_inicio} onChange={e => updLinha(i, { data_inicio: e.target.value })} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {i === 0 && <Label className="text-xs">Fim</Label>}
                  <Input type="date" value={a.data_fim} onChange={e => updLinha(i, { data_fim: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => rmLinha(i)} aria-label="Remover atividade">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLinha}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar atividade
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={saving} onClick={onSave}>{saving ? 'Salvando...' : 'Salvar Aditivo'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
