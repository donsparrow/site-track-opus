import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOTIVOS, type ObraOption, type PontoStatus } from '../types';
import type { CelulaPonto } from '../utils';
import { parseISODate } from '../utils';

const AVULSA = '__avulsa__';

export interface CelulaSelecionada {
  funcionarioId: string;
  funcionarioNome: string;
  data: string;
  celula: CelulaPonto;
}

interface Props {
  selecionada: CelulaSelecionada | null;
  obras: ObraOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    status: PontoStatus;
    motivo: string | null;
    obraId: string | null;
    obraTexto: string | null;
    observacao: string | null;
  }) => void;
  onLimpar: (registroId: string) => void;
}

export default function PontoCelulaDialog({ selecionada, obras, saving, onClose, onSave, onLimpar }: Props) {
  const [status, setStatus] = useState<PontoStatus>('integral');
  const [motivo, setMotivo] = useState('folga');
  const [motivoTexto, setMotivoTexto] = useState('');
  const [obraSel, setObraSel] = useState(AVULSA);
  const [obraTexto, setObraTexto] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (!selecionada) return;
    const c = selecionada.celula;
    setStatus(c.status === 'na' ? 'integral' : (c.status as PontoStatus));
    const conhecido = c.motivo && MOTIVOS.includes(c.motivo);
    setMotivo(conhecido ? (c.motivo as string) : c.motivo ? 'outro' : 'folga');
    setMotivoTexto(conhecido ? '' : c.motivo ?? '');
    setObraSel(c.obraId ?? AVULSA);
    setObraTexto(c.obraTexto ?? '');
    setObservacao(c.registro?.observacao ?? '');
  }, [selecionada]);

  if (!selecionada) return null;
  const dataLabel = parseISODate(selecionada.data).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit',
  });

  const salvar = () =>
    onSave({
      status,
      motivo: status === 'falta' ? (motivo === 'outro' ? motivoTexto.trim() || 'outro' : motivo) : null,
      obraId: obraSel === AVULSA ? null : obraSel,
      obraTexto: obraSel === AVULSA ? obraTexto.trim() || null : null,
      observacao: observacao.trim() || null,
    });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{selecionada.funcionarioNome}</DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">{dataLabel}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'integral', l: 'Integral' },
                { v: 'meio', l: 'Meio dia' },
                { v: 'falta', l: 'Falta' },
              ] as const).map((o) => (
                <Button
                  key={o.v}
                  type="button"
                  variant={status === o.v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus(o.v)}
                >
                  {o.l}
                </Button>
              ))}
            </div>
          </div>

          {status === 'falta' ? (
            <div className="space-y-2">
              <Label>Motivo</Label>
              <div className="flex flex-wrap gap-1.5">
                {MOTIVOS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={motivo === m ? 'default' : 'outline'}
                    className="capitalize"
                    onClick={() => setMotivo(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
              {motivo === 'outro' && (
                <Input value={motivoTexto} onChange={(e) => setMotivoTexto(e.target.value)} placeholder="Descreva o motivo" />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Obra do dia</Label>
              <Select value={obraSel} onValueChange={setObraSel}>
                <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                <SelectContent>
                  {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  <SelectItem value={AVULSA}>Obra avulsa</SelectItem>
                </SelectContent>
              </Select>
              {obraSel === AVULSA && (
                <Input value={obraTexto} onChange={(e) => setObraTexto(e.target.value)} placeholder="Descreva a obra avulsa" />
              )}
              <p className="text-xs text-muted-foreground">
                A obra escolhida passa a valer para os próximos dias do funcionário.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {selecionada.celula.registro && (
            <Button
              variant="ghost"
              className="text-destructive mr-auto"
              onClick={() => onLimpar(selecionada.celula.registro!.id)}
            >
              Limpar registro
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
