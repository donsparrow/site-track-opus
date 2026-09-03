import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DIAS_SEMANA, type Funcionario, type FuncionarioFormValues, type ObraOption } from '../types';
import FuncionarioFormDialog from './FuncionarioFormDialog';

interface Props {
  funcionarios: Funcionario[];
  obras: ObraOption[];
  isLoading: boolean;
  canEdit: boolean;
  saving: boolean;
  onSave: (editId: string | null, values: FuncionarioFormValues) => void;
  onToggleAtivo: (id: string, ativo: boolean) => void;
  onDelete: (id: string) => void;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CadastroTab({
  funcionarios, obras, isLoading, canEdit, saving, onSave, onToggleAtivo, onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Funcionario | null>(null);

  const nomeObra = (f: Funcionario) =>
    f.obra_atual_id ? obras.find((o) => o.id === f.obra_atual_id)?.nome ?? '—' : f.obra_atual_texto || '—';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && (
          <Button onClick={() => { setEdit(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo funcionário
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : funcionarios.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhum funcionário cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Diária</TableHead>
                  <TableHead>Dias padrão</TableHead>
                  <TableHead>Obra atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcionarios.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>{f.funcao || '—'}</TableCell>
                    <TableCell>{brl(Number(f.valor_diaria))}</TableCell>
                    <TableCell className="text-xs">
                      {(f.dias_padrao || []).map((d) => DIAS_SEMANA[d]?.label).filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell>{nomeObra(f)}</TableCell>
                    <TableCell>
                      <Badge variant={f.ativo ? 'default' : 'secondary'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => onToggleAtivo(f.id, !f.ativo)}>
                            {f.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEdit(f); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(f.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FuncionarioFormDialog
        open={open}
        onOpenChange={setOpen}
        funcionario={edit}
        obras={obras}
        saving={saving}
        onSave={(values) => { onSave(edit?.id ?? null, values); setOpen(false); }}
      />
    </div>
  );
}
