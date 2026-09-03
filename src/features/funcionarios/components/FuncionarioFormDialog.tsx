import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DIAS_SEMANA, type Funcionario, type FuncionarioFormValues, type ObraOption } from '../types';

const AVULSA = '__avulsa__';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  funcionario: Funcionario | null;
  obras: ObraOption[];
  saving: boolean;
  onSave: (values: FuncionarioFormValues) => void;
}

export default function FuncionarioFormDialog({ open, onOpenChange, funcionario, obras, saving, onSave }: Props) {
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [valorDiaria, setValorDiaria] = useState('0');
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [obraSel, setObraSel] = useState<string>(AVULSA);
  const [obraTexto, setObraTexto] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [foto, setFoto] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setNome(funcionario?.nome ?? '');
    setFuncao(funcionario?.funcao ?? '');
    setTelefone(funcionario?.telefone ?? '');
    setValorDiaria(String(funcionario?.valor_diaria ?? 0));
    setDias(funcionario?.dias_padrao ?? [1, 2, 3, 4, 5]);
    setObraSel(funcionario?.obra_atual_id ?? AVULSA);
    setObraTexto(funcionario?.obra_atual_texto ?? '');
    setAtivo(funcionario?.ativo ?? true);
    setFoto(null);
  }, [open, funcionario]);

  const toggleDia = (d: number) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const submit = () => {
    if (!nome.trim()) return;
    onSave({
      nome,
      funcao,
      telefone,
      valor_diaria: Number(valorDiaria) || 0,
      dias_padrao: dias,
      obra_atual_id: obraSel === AVULSA ? null : obraSel,
      obra_atual_texto: obraTexto,
      ativo,
      fotoFile: foto,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{funcionario ? 'Editar funcionário' : 'Novo funcionário'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Função</Label>
              <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Pedreiro" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor da diária (R$)</Label>
              <Input type="number" min="0" step="0.01" value={valorDiaria} onChange={(e) => setValorDiaria(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Foto</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dias padrão de trabalho</Label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map((d) => (
                <Button
                  key={d.valor}
                  type="button"
                  size="sm"
                  variant={dias.includes(d.valor) ? 'default' : 'outline'}
                  onClick={() => toggleDia(d.valor)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Obra atual</Label>
            <Select value={obraSel} onValueChange={setObraSel}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
                <SelectItem value={AVULSA}>Obra avulsa</SelectItem>
              </SelectContent>
            </Select>
            {obraSel === AVULSA && (
              <Input
                value={obraTexto}
                onChange={(e) => setObraTexto(e.target.value)}
                placeholder="Descreva a obra avulsa"
              />
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Ativo</Label>
              <p className="text-xs text-muted-foreground">Aparece na grade de ponto</p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !nome.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
