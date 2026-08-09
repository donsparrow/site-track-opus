import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { mapLegacyStatus, percentualToStatus, statusLabels } from '../utils';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SelecaoServico } from './SelecaoServico';
import type { CronogramaAtividadeOption, DiarioAtividade } from '../types';

interface UpdatePayload {
  id: string;
  descricao: string;
  percentual: number;
  cronogramaAtividadeId: string | null;
  silent?: boolean;
}

interface Props {
  atividades: DiarioAtividade[];
  cronogramaAtividades: CronogramaAtividadeOption[];
  canEdit: boolean;
  onAdd: (v: { descricao: string; percentual: number; cronogramaAtividadeId: string | null }) => void;
  onUpdate: (v: UpdatePayload) => void;
  onDelete: (id: string) => void;
}

export function AtividadesTab({ atividades, cronogramaAtividades, canEdit, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const lancadasIds = useMemo(
    () => atividades.map((a) => a.cronograma_atividade_id).filter((id): id is string => !!id),
    [atividades],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-display">Atividades</CardTitle>
        {canEdit && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}
      </CardHeader>
      <CardContent>
        {adding && (
          <InlineAtividadeForm
            cronogramaAtividades={cronogramaAtividades}
            lancadasIds={lancadasIds}
            onSave={(descricao, percentual, cronId) => { onAdd({ descricao, percentual, cronogramaAtividadeId: cronId }); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}
        {atividades.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
        ) : (
          <div className="space-y-2">
            {atividades.map((a) =>
              editingId === a.id ? (
                <AtividadeEditRow
                  key={a.id}
                  atividade={a}
                  cronogramaAtividades={cronogramaAtividades}
                  lancadasIds={lancadasIds}
                  onCancel={() => setEditingId(null)}
                  onSave={(payload) => { onUpdate(payload); setEditingId(null); }}
                />
              ) : (
                <AtividadeRow
                  key={a.id}
                  atividade={a}
                  canEdit={canEdit}
                  onEdit={() => setEditingId(a.id)}
                  onDelete={() => onDelete(a.id)}
                  onUpdate={onUpdate}
                />
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Linha de leitura com slider de progresso debounced (500ms) e update otimista. */
function AtividadeRow({ atividade, canEdit, onEdit, onDelete, onUpdate }: {
  atividade: DiarioAtividade;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (v: UpdatePayload) => void;
}) {
  const { value, onChange } = useDebouncedValue(atividade.percentual || 0, (percentual) =>
    onUpdate({
      id: atividade.id,
      descricao: atividade.descricao,
      percentual,
      cronogramaAtividadeId: atividade.cronograma_atividade_id,
      silent: true,
    }),
  );
  const status = canEdit ? percentualToStatus(value) : mapLegacyStatus(atividade.status);

  return (
    <div className="flex flex-col gap-1 p-2 rounded border">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm">{atividade.descricao}</span>
        <span className="text-xs font-medium text-muted-foreground">{value}%</span>
        <Badge variant={status === 'concluido' ? 'default' : status === 'andamento' ? 'secondary' : 'outline'}>
          {statusLabels[status] || status}
        </Badge>
        {canEdit && (
          <>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
          </>
        )}
      </div>
      {canEdit ? (
        <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={0} max={100} step={1} className="mt-1" />
      ) : (
        <Progress value={atividade.percentual || 0} className="h-2" />
      )}
    </div>
  );
}

function AtividadeEditRow({ atividade, cronogramaAtividades, onCancel, onSave }: {
  atividade: DiarioAtividade;
  cronogramaAtividades: CronogramaAtividadeOption[];
  onCancel: () => void;
  onSave: (payload: UpdatePayload) => void;
}) {
  const [descricao, setDescricao] = useState(atividade.descricao);
  const [percentual, setPercentual] = useState(atividade.percentual || 0);
  const [cronId, setCronId] = useState<string | null>(atividade.cronograma_atividade_id);
  const status = percentualToStatus(percentual);

  return (
    <div className="flex flex-col gap-2 p-3 rounded border border-accent bg-accent/5">
      {cronogramaAtividades.length > 0 && (
        <Select value={cronId || ''} onValueChange={(v) => setCronId(v || null)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vincular ao Cronograma (opcional)" /></SelectTrigger>
          <SelectContent>
            {cronogramaAtividades.map((ca) => (
              <SelectItem key={ca.id} value={ca.id}>{ca.nome_atividade} — {ca.percentual_concluido || 0}%</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center gap-2">
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="flex-1" />
        <Badge variant={status === 'concluido' ? 'default' : status === 'andamento' ? 'secondary' : 'outline'}>
          {statusLabels[status]}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="number" min={0} max={100} step={0.5} value={percentual}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setPercentual(isNaN(v) ? 0 : Math.min(100, Math.max(0, v)));
          }}
          className="w-20 h-8"
        />
        <span className="text-xs text-muted-foreground">%</span>
        <Slider value={[percentual]} onValueChange={(v) => setPercentual(v[0])} min={0} max={100} step={1} className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => onSave({ id: atividade.id, descricao, percentual, cronogramaAtividadeId: cronId })}>
          <Save className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function InlineAtividadeForm({ cronogramaAtividades, onSave, onCancel }: {
  cronogramaAtividades: CronogramaAtividadeOption[];
  onSave: (descricao: string, percentual: number, cronId: string | null) => void;
  onCancel: () => void;
}) {
  const [p, setP] = useState(0);
  const [cronId, setCronId] = useState('');
  const status = percentualToStatus(p);
  const selected = cronogramaAtividades.find((c) => c.id === cronId);
  const descricao = selected?.nome_atividade || '';

  if (cronogramaAtividades.length === 0) {
    return (
      <div className="flex flex-col gap-2 mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          ⚠ Nenhuma atividade cadastrada no Cronograma desta obra. Cadastre as atividades no <strong>Cronograma</strong> antes de registrar execução no diário.
        </p>
        <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={onCancel}>Fechar</Button></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mb-3 p-3 bg-muted rounded">
      <SelecaoServico
        atividades={cronogramaAtividades}
        lancadasIds={lancadasIds}
        value={cronId}
        onChange={setCronId}
      />
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-medium">
          {descricao || <span className="text-muted-foreground italic">Selecione uma atividade</span>}
        </span>
        <Badge variant={status === 'concluido' ? 'default' : status === 'andamento' ? 'secondary' : 'outline'}>
          {statusLabels[status]}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="number" min={0} max={100} step={0.5} value={p}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setP(isNaN(v) ? 0 : Math.min(100, Math.max(0, v)));
          }}
          className="w-20 h-8"
        />
        <span className="text-xs text-muted-foreground">%</span>
        <Slider value={[p]} onValueChange={(v) => setP(v[0])} min={0} max={100} step={1} className="flex-1" />
      </div>
      <p className="text-[10px] text-muted-foreground">✓ O progresso atualizará automaticamente a atividade vinculada no Cronograma.</p>
      <div className="flex gap-2 justify-end">
        <Button size="sm" onClick={() => {
          if (!cronId) { toast.error('Selecione uma atividade do Cronograma'); return; }
          onSave(descricao, p, cronId);
        }}>OK</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>✕</Button>
      </div>
    </div>
  );
}
