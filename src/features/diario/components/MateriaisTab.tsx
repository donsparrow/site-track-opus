import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { DiarioMaterial } from '../types';

interface Props {
  materiais: DiarioMaterial[];
  canEdit: boolean;
  canEditDelete: boolean;
  onAdd: (v: { material: string; quantidade: string; unidade: string }) => void;
  onUpdate: (v: { id: string; material: string; quantidade: string; unidade: string }) => void;
  onDelete: (id: string) => void;
}

export function MateriaisTab({ materiais, canEdit, canEditDelete, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [material, setMaterial] = useState('');
  const [qtd, setQtd] = useState('');
  const [unidade, setUnidade] = useState('');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-display">Materiais</CardTitle>
        {canEdit && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
      </CardHeader>
      <CardContent>
        {adding && (
          <InlineMaterialForm
            onSave={(m, q, u) => { onAdd({ material: m, quantidade: q, unidade: u }); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}
        {materiais.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead><TableHead>Qtd</TableHead><TableHead>Unidade</TableHead>
                {canEditDelete && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {materiais.map((m) =>
                editingId === m.id ? (
                  <TableRow key={m.id}>
                    <TableCell><Input value={material} onChange={(e) => setMaterial(e.target.value)} className="h-8" /></TableCell>
                    <TableCell><Input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} className="h-8 w-20" /></TableCell>
                    <TableCell><Input value={unidade} onChange={(e) => setUnidade(e.target.value)} className="h-8 w-16" /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { onUpdate({ id: m.id, material, quantidade: qtd, unidade }); setEditingId(null); }}><Save className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={m.id}>
                    <TableCell>{m.material}</TableCell>
                    <TableCell>{m.quantidade}</TableCell>
                    <TableCell>{m.unidade}</TableCell>
                    {canEditDelete && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                            setEditingId(m.id);
                            setMaterial(m.material);
                            setQtd(String(m.quantidade || 0));
                            setUnidade(m.unidade || 'un');
                          }}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(m.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function InlineMaterialForm({ onSave, onCancel }: { onSave: (m: string, q: string, u: string) => void; onCancel: () => void }) {
  const [m, setM] = useState('');
  const [q, setQ] = useState('1');
  const [u, setU] = useState('un');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded">
      <Input placeholder="Material" value={m} onChange={(e) => setM(e.target.value)} className="flex-1" />
      <Input type="number" placeholder="Qtd" value={q} onChange={(e) => setQ(e.target.value)} className="w-20" />
      <Input placeholder="Un" value={u} onChange={(e) => setU(e.target.value)} className="w-16" />
      <Button size="sm" onClick={() => m && onSave(m, q, u)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}
