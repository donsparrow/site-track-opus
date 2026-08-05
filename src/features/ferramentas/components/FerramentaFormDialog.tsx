import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { STATUS_CONFIG, TIPO_LABELS, type Ferramenta, type FerramentaFormValues, type ObraOption } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editFerramenta: Ferramenta | null;
  obras: ObraOption[];
  onSave: (values: FerramentaFormValues) => void;
  saving: boolean;
}

const EMPTY: FerramentaFormValues = {
  nome: '',
  numeroCadastro: '',
  tipo: 'manual',
  status: 'disponivel',
  obraId: '',
  voltagem: '',
};

export default function FerramentaFormDialog({ open, onOpenChange, editFerramenta, obras, onSave, saving }: Props) {
  const [values, setValues] = useState<FerramentaFormValues>(EMPTY);

  useEffect(() => {
    if (editFerramenta) {
      setValues({
        nome: editFerramenta.nome,
        numeroCadastro: editFerramenta.numero_cadastro,
        tipo: editFerramenta.tipo,
        status: editFerramenta.status,
        obraId: editFerramenta.obra_id || '',
        voltagem: editFerramenta.voltagem || '',
      });
    } else if (open) {
      setValues(EMPTY);
    }
  }, [editFerramenta, open]);

  const handleSave = () => {
    if (!values.nome.trim() || !values.numeroCadastro.trim()) {
      toast.error('Preencha nome e número de cadastro');
      return;
    }
    if (values.tipo === 'eletrica' && !values.voltagem) {
      toast.error('Selecione a voltagem do equipamento elétrico');
      return;
    }
    onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editFerramenta ? 'Editar Ferramenta' : 'Nova Ferramenta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Equipamento *</Label>
              <Input value={values.nome} onChange={(e) => setValues((v) => ({ ...v, nome: e.target.value }))} placeholder="Ex: Furadeira Bosch" />
            </div>
            <div className="space-y-2">
              <Label>Nº Cadastro *</Label>
              <Input value={values.numeroCadastro} onChange={(e) => setValues((v) => ({ ...v, numeroCadastro: e.target.value }))} placeholder="Ex: FER-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={values.tipo}
                onValueChange={(v) => setValues((prev) => ({ ...prev, tipo: v, voltagem: v !== 'eletrica' ? '' : prev.voltagem }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(v) => setValues((prev) => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {values.tipo === 'eletrica' && (
            <div className="space-y-2">
              <Label>Voltagem *</Label>
              <Select value={values.voltagem} onValueChange={(v) => setValues((prev) => ({ ...prev, voltagem: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a voltagem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="110V">110V</SelectItem>
                  <SelectItem value="220V">220V</SelectItem>
                  <SelectItem value="Bivolt (110V/220V)">Bivolt (110V/220V)</SelectItem>
                  <SelectItem value="380V">380V</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Obra Vinculada</Label>
            <Select value={values.obraId} onValueChange={(v) => setValues((prev) => ({ ...prev, obraId: v }))}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma</SelectItem>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {editFerramenta ? 'Salvar Alterações' : 'Cadastrar Ferramenta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
