import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { fmtData } from '../utils';
import { toast } from 'sonner';
import type { DiarioParalisacao } from '../types';

const MOTIVOS_RAPIDOS = ['Chuva', 'Feriado', 'Aguardando condomínio', 'Falta de material'];

function isDiaUtil(data: string) {
  const [y, m, d] = data.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow !== 0 && dow !== 6;
}

interface Props {
  paralisacoes: DiarioParalisacao[];
  dataDiario: string;
  canEdit: boolean;
  canEditDelete: boolean;
  onAdd: (v: { motivo: string; data: string }) => void;
  onUpdate: (v: { id: string; motivo: string }) => void;
  onDelete: (id: string) => void;
}

function fmtPeriodo(p: DiarioParalisacao) {
  if (p.data_fim && p.data_fim !== p.data_inicio) return `${fmtData(p.data_inicio)} a ${fmtData(p.data_fim)}`;
  return fmtData(p.data_inicio);
}

export function ParalisacoesTab({ paralisacoes, dataDiario, canEdit, canEditDelete, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const dataFmt = dataDiario ? fmtData(dataDiario) : '';
  const util = dataDiario ? isDiaUtil(dataDiario) : true;

  return (
    <Card>
      <CardHeader className="py-3 space-y-1">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-display">Paralisações</CardTitle>
          {canEdit && paralisacoes.length === 0 && !adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
          )}
        </div>
        {dataDiario && (
          <p className="text-xs text-muted-foreground">
            {util
              ? `Paralisação referente a ${dataFmt}. Este dia será descontado do prazo da obra.`
              : `${dataFmt} não é dia útil — a paralisação fica registrada, mas não altera o prazo.`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {adding && (
          <InlineParalisacaoForm
            onSave={(m) => { onAdd({ motivo: m, data: dataDiario }); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}
        {paralisacoes.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
        ) : paralisacoes.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead><TableHead>Data</TableHead>
                {canEditDelete && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paralisacoes.map((p) =>
                editingId === p.id ? (
                  <TableRow key={p.id}>
                    <TableCell><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-8" /></TableCell>
                    <TableCell>{fmtPeriodo(p)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          if (!motivo.trim()) { toast.error('Informe o motivo.'); return; }
                          onUpdate({ id: p.id, motivo: motivo.trim() }); setEditingId(null);
                        }}><Save className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={p.id}>
                    <TableCell>{p.motivo}</TableCell>
                    <TableCell>{fmtPeriodo(p)}</TableCell>
                    {canEditDelete && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(p.id); setMotivo(p.motivo); }}><Pencil className="h-3 w-3" /></Button>
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

function InlineParalisacaoForm({ onSave, onCancel }: { onSave: (m: string) => void; onCancel: () => void }) {
  const [m, setM] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const salvar = () => {
    if (!m.trim()) { toast.error('Informe o motivo.'); return; }
    onSave(m.trim());
  };
  return (
    <div className="mb-3 p-2 bg-muted rounded space-y-2">
      <div className="flex flex-wrap gap-2">
        {MOTIVOS_RAPIDOS.map((t) => (
          <Button key={t} type="button" size="sm" variant="outline" onClick={() => setM(t)}>{t}</Button>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => { setM(''); inputRef.current?.focus(); }}>Outro</Button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <Input ref={inputRef} placeholder="Motivo" value={m} onChange={(e) => setM(e.target.value)} className="flex-1 min-w-[150px]" />
        <Button size="sm" onClick={salvar}>OK</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
