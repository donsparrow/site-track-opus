import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Trash2 } from 'lucide-react';
import { WIDGET_REGISTRY } from './widgetRegistry';
import type { WidgetInstance, WidgetConfig, WidgetPeriod, WidgetSize } from '@/types/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';

interface Props {
  widget: WidgetInstance | null;
  onClose: () => void;
  onSave: (next: WidgetInstance) => void;
  onDuplicate: (w: WidgetInstance) => void;
  onDelete: (id: string) => void;
}

const PERIODS: { value: WidgetPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'custom', label: 'Personalizado' },
];

export default function WidgetConfigDialog({ widget, onClose, onSave, onDuplicate, onDelete }: Props) {
  const { obras } = useDashboardData();
  const [config, setConfig] = useState<WidgetConfig>({});
  const [size, setSize] = useState<WidgetSize>('small');

  useEffect(() => {
    if (widget) {
      setConfig(widget.config || {});
      setSize(widget.size);
      console.log('[WidgetSize] sync from prop:', widget.size);
    }
  }, [widget]);

  if (!widget) return null;
  const def = WIDGET_REGISTRY[widget.type];
  if (!def) return null;

  const update = <K extends keyof WidgetConfig>(k: K, v: WidgetConfig[K]) => setConfig(c => ({ ...c, [k]: v }));

  return (
    <Dialog open={!!widget} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar: {def.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título do widget</Label>
            <Input value={config.title ?? ''} placeholder={def.label} onChange={(e) => update('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cor do cabeçalho</Label>
            <div className="flex items-center gap-2">
              <input type="color" className="h-9 w-12 rounded border" value={config.headerColor ?? '#1e3a5f'} onChange={(e) => update('headerColor', e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => update('headerColor', undefined)}>Limpar</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tamanho</Label>
            <Select
              value={size}
              onValueChange={(v) => {
                console.log('[WidgetSize] onValueChange:', v, 'prev local:', size, 'prop:', widget.size);
                setSize(v as WidgetSize);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeno</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
                <SelectItem value="full">Largura total</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={config.period ?? '30d'} onValueChange={(v) => update('period', v as WidgetPeriod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {config.period === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Input type="date" value={config.periodStart ?? ''} onChange={(e) => update('periodStart', e.target.value)} />
                <Input type="date" value={config.periodEnd ?? ''} onChange={(e) => update('periodEnd', e.target.value)} />
              </div>
            )}
          </div>
          {def.supportsObraFilter && (
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select value={config.obraId ?? '__all__'} onValueChange={(v) => update('obraId', v === '__all__' ? undefined : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as obras</SelectItem>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onDuplicate({ ...widget, config }); onClose(); }}>
              <Copy className="h-4 w-4 mr-1" /> Duplicar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => { onDelete(widget.id); onClose(); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          </div>
          <Button onClick={() => { onSave({ ...widget, config }); onClose(); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
