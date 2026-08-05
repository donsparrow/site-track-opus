import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, Sun, X } from 'lucide-react';
import { climaIcons } from '../utils';
import type { DiarioDetalhado, DiarioFormValues } from '../types';

interface Props {
  diario: DiarioDetalhado;
  editMode: boolean;
  canEditDelete: boolean;
  onEnterEdit: () => void;
  onCancelEdit: () => void;
  onSave: (values: DiarioFormValues) => void;
}

export function CabecalhoDiario({ diario, editMode, canEditDelete, onEnterEdit, onCancelEdit, onSave }: Props) {
  const toForm = (): DiarioFormValues => ({
    data: diario.data,
    clima: diario.clima,
    temperatura: diario.temperatura || '',
    horario_inicio: diario.horario_inicio || '',
    horario_fim: diario.horario_fim || '',
    observacoes_gerais: diario.observacoes_gerais || '',
  });

  const [form, setForm] = useState<DiarioFormValues>(toForm);

  useEffect(() => {
    if (editMode) setForm(toForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, diario.id]);

  const ClimaIcon = climaIcons[diario.clima] || Sun;

  return (
    <>
      {editMode && (
        <div className="flex items-center justify-between bg-accent/10 rounded-lg p-3 border border-accent">
          <span className="text-sm font-medium text-accent flex items-center gap-2">
            <Pencil className="h-4 w-4" />Modo Edição Ativo
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancelEdit}><X className="h-3 w-3 mr-1" />Cancelar</Button>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => onSave(form)}>
              <Save className="h-3 w-3 mr-1" />Salvar Alterações
            </Button>
          </div>
        </div>
      )}

      {!editMode && canEditDelete && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onEnterEdit}><Pencil className="h-3 w-3 mr-1" />Editar Diário</Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          {editMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Clima</Label>
                  <Select value={form.clima} onValueChange={(v) => setForm({ ...form, clima: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sol">☀️ Sol</SelectItem>
                      <SelectItem value="nublado">☁️ Nublado</SelectItem>
                      <SelectItem value="chuva">🌧️ Chuva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Temperatura</Label>
                  <Input placeholder="Ex: 28°C" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Horário Início</Label>
                  <Input type="time" value={form.horario_inicio} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Horário Fim</Label>
                  <Input type="time" value={form.horario_fim} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.observacoes_gerais} onChange={(e) => setForm({ ...form, observacoes_gerais: e.target.value })} className="min-h-[60px]" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ClimaIcon className="h-6 w-6 text-accent" />
              <div>
                <CardTitle className="font-display">
                  {new Date(diario.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {diario.horario_inicio?.slice(0, 5)} - {diario.horario_fim?.slice(0, 5)}
                  {diario.temperatura && ` · ${diario.temperatura}`}
                </p>
              </div>
            </div>
          )}
        </CardHeader>
        {!editMode && diario.observacoes_gerais && (
          <CardContent className="pt-0"><p className="text-sm">{diario.observacoes_gerais}</p></CardContent>
        )}
      </Card>
    </>
  );
}
