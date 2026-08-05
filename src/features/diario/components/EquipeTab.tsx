import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { DiarioEquipe } from '../types';

interface Props {
  equipe: DiarioEquipe[];
  canEdit: boolean;
  canEditDelete: boolean;
  onAdd: (v: { nome: string; funcao: string; horas: string }) => void;
  onUpdate: (v: { id: string; nome: string; funcao: string; horas: string }) => void;
  onDelete: (id: string) => void;
}

export function EquipeTab({ equipe, canEdit, canEditDelete, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [horas, setHoras] = useState('');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-display">Equipe</CardTitle>
        {canEdit && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
      </CardHeader>
      <CardContent>
        {adding && <InlineEquipeForm onSave={(n, f, h) => { onAdd({ nome: n, funcao: f, horas: h }); setAdding(false); }} onCancel={() => setAdding(false)} />}
        {equipe.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead><TableHead>Função</TableHead><TableHead>Horas</TableHead>
                {canEditDelete && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipe.map((e) =>
                editingId === e.id ? (
                  <TableRow key={e.id}>
                    <TableCell><Input value={nome} onChange={(ev) => setNome(ev.target.value)} className="h-8" /></TableCell>
                    <TableCell><Input value={funcao} onChange={(ev) => setFuncao(ev.target.value)} className="h-8" /></TableCell>
                    <TableCell><Input type="number" value={horas} onChange={(ev) => setHoras(ev.target.value)} className="h-8 w-20" /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { onUpdate({ id: e.id, nome, funcao, horas }); setEditingId(null); }}><Save className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={e.id}>
                    <TableCell>{e.nome_funcionario}</TableCell>
                    <TableCell>{e.funcao || '—'}</TableCell>
                    <TableCell>{e.horas_trabalhadas}h</TableCell>
                    {canEditDelete && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                            setEditingId(e.id);
                            setNome(e.nome_funcionario);
                            setFuncao(e.funcao || '');
                            setHoras(String(e.horas_trabalhadas || 0));
                          }}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(e.id)}><Trash2 className="h-3 w-3" /></Button>
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

function InlineEquipeForm({ onSave, onCancel }: { onSave: (n: string, f: string, h: string) => void; onCancel: () => void }) {
  const [n, setN] = useState('');
  const [f, setF] = useState('');
  const [h, setH] = useState('8');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded">
      <Input placeholder="Nome" value={n} onChange={(e) => setN(e.target.value)} className="flex-1" />
      <Input placeholder="Função" value={f} onChange={(e) => setF(e.target.value)} className="w-28" />
      <Input type="number" placeholder="Horas" value={h} onChange={(e) => setH(e.target.value)} className="w-20" />
      <Button size="sm" onClick={() => n && onSave(n, f, h)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}
