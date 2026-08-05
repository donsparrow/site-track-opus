import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Atividade, AtividadeFormData } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAtividade: Atividade | null;
  formData: AtividadeFormData;
  setFormData: React.Dispatch<React.SetStateAction<AtividadeFormData>>;
  atividades: Atividade[];
  canEditPeso: boolean;
  onSave: () => void;
}

export default function AtividadeDialog({
  open,
  onOpenChange,
  editingAtividade,
  formData,
  setFormData,
  atividades,
  canEditPeso,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingAtividade ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome da Atividade</Label>
              <Input value={formData.nome_atividade} onChange={e => setFormData(f => ({ ...f, nome_atividade: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={formData.tipo_atividade} onValueChange={v => setFormData(f => ({ ...f, tipo_atividade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Contrato Original</SelectItem>
                  <SelectItem value="aditivo">Aditivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea rows={2} value={formData.descricao} onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={formData.data_inicio} onChange={e => setFormData(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={formData.data_fim} onChange={e => setFormData(f => ({ ...f, data_fim: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Progresso (%)</Label>
              <Input type="number" min={0} max={100} value={formData.percentual_concluido} onChange={e => setFormData(f => ({ ...f, percentual_concluido: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
            </div>
            <div>
              <Label>Peso (%) {!canEditPeso && <span className="text-muted-foreground text-xs">— somente admin</span>}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.peso}
                onChange={e => setFormData(f => ({ ...f, peso: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                disabled={!canEditPeso}
              />
              {(() => {
                if (formData.tipo_atividade === 'aditivo') {
                  return <p className="text-xs text-amber-600 mt-1">Aditivos somam fora dos 100% do escopo original</p>;
                }
                const otherPeso = atividades
                  .filter(a => (a.tipo_atividade || 'original') === 'original')
                  .filter(a => !editingAtividade || a.id !== editingAtividade.id)
                  .reduce((s, a) => s + (a.peso || 0), 0);
                const newTotal = otherPeso + formData.peso;
                if (newTotal !== 100) {
                  return <p className="text-xs text-destructive mt-1">Total dos pesos originais: {newTotal}% (deve ser 100%)</p>;
                }
                return <p className="text-xs text-success mt-1">Total dos pesos: 100% ✓</p>;
              })()}
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} value={formData.observacoes} onChange={e => setFormData(f => ({ ...f, observacoes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
