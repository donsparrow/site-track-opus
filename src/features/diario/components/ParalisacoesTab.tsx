import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { fmtData } from '../utils';
import type { DiarioParalisacao } from '../types';

interface Props {
  paralisacoes: DiarioParalisacao[];
  canEdit: boolean;
  canEditDelete: boolean;
  onAdd: (v: { motivo: string; dataInicio: string; dataFim: string }) => void;
  onUpdate: (v: { id: string; motivo: string; dataInicio: string; dataFim: string }) => void;
  onDelete: (id: string) => void;
}

export function ParalisacoesTab({ paralisacoes, canEdit, canEditDelete, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-display">Paralisações</CardTitle>
        {canEdit && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
      </CardHeader>
      <CardContent>
        {adding && (
          <InlineParalisacaoForm
            onSave={(m, di, df) => { onAdd({ motivo: m, dataInicio: di, dataFim: df }); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}
        {paralisacoes.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Dias</TableHead>
                {canEditDelete && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paralisacoes.map((p) =>
                editingId === p.id ? (
                  <TableRow key={p.id}>
                    <TableCell><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-8" /></TableCell>
                    <TableCell><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="h-8" /></TableCell>
                    <TableCell><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-8" /></TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { onUpdate({ id: p.id, motivo, dataInicio: inicio, dataFim: fim }); setEditingId(null); }}><Save className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={p.id}>
                    <TableCell>{p.motivo}</TableCell>
                    <TableCell>{fmtData(p.data_inicio)}</TableCell>
                    <TableCell>{p.data_fim ? fmtData(p.data_fim) : '—'}</TableCell>
                    <TableCell>{p.total_dias}</TableCell>
                    {canEditDelete && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                            setEditingId(p.id);
                            setMotivo(p.motivo);
                            setInicio(p.data_inicio);
                            setFim(p.data_fim || '');
                          }}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
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

function InlineParalisacaoForm({ onSave, onCancel }: { onSave: (m: string, di: string, df: string) => void; onCancel: () => void }) {
  const [m, setM] = useState('');
  const [di, setDi] = useState(new Date().toISOString().split('T')[0]);
  const [df, setDf] = useState('');
  return (
    <div className="flex gap-2 mb-3 p-2 bg-muted rounded flex-wrap">
      <Input placeholder="Motivo" value={m} onChange={(e) => setM(e.target.value)} className="flex-1 min-w-[150px]" />
      <Input type="date" value={di} onChange={(e) => setDi(e.target.value)} className="w-36" />
      <Input type="date" value={df} onChange={(e) => setDf(e.target.value)} className="w-36" />
      <Button size="sm" onClick={() => m && onSave(m, di, df)}>OK</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
    </div>
  );
}
