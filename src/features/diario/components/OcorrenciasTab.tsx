import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { DiarioOcorrencia } from '../types';

interface Props {
  ocorrencias: DiarioOcorrencia[];
  canEdit: boolean;
  canEditDelete: boolean;
  onAdd: (v: { descricao: string; impacto: string }) => void;
  onUpdate: (v: { id: string; descricao: string; impacto: string }) => void;
  onDelete: (id: string) => void;
}

export function OcorrenciasTab({ ocorrencias, canEdit, canEditDelete, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [impacto, setImpacto] = useState('baixo');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-display">Ocorrências</CardTitle>
        {canEdit && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
      </CardHeader>
      <CardContent>
        {adding && (
          <InlineOcorrenciaForm
            onSave={(d, i) => { onAdd({ descricao: d, impacto: i }); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}
        {ocorrencias.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
        ) : (
          <div className="space-y-2">
            {ocorrencias.map((o) =>
              editingId === o.id ? (
                <div key={o.id} className="flex items-center gap-2 p-2 rounded border border-accent bg-accent/5">
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="flex-1 h-8" />
                  <Select value={impacto} onValueChange={setImpacto}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo">Baixo</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { onUpdate({ id: o.id, descricao, impacto }); setEditingId(null); }}><Save className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <div key={o.id} className="flex items-center gap-2 p-2 rounded border">
                  <span className="flex-1 text-sm">{o.descricao}</span>
                  <Badge variant={o.impacto === 'alto' ? 'destructive' : o.impacto === 'medio' ? 'secondary' : 'outline'}>
                    {o.impacto}
                  </Badge>
                  {canEditDelete && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                        setEditingId(o.id);
                        setDescricao(o.descricao);
                        setImpacto(o.impacto);
                      }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(o.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InlineOcorrenciaForm({ onSave, onCancel }: { onSave: (d: string, i: string) => void; onCancel: () => void }) {
  const [d, setD] = useState('');
  const [i, setI] = useState('baixo');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded">
      <Input placeholder="Descrição" value={d} onChange={(e) => setD(e.target.value)} className="flex-1" />
      <Select value={i} onValueChange={setI}>
        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="baixo">Baixo</SelectItem>
          <SelectItem value="medio">Médio</SelectItem>
          <SelectItem value="alto">Alto</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" onClick={() => d && onSave(d, i)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}
