import { useState } from 'react';
import { Check, FileText, SearchCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { ObraOption, TipoRelatorio } from '../types';
import type { LaudoLista } from '../hooks/useLaudosLista';
import { statusLaudo, textoStatusLaudo, tipoLaudo } from '../lib/status';
import { useRelatorioFinalMutations } from '../hooks/useRelatorioFinalMutations';

export default function NovoLaudoDialog({ open, onOpenChange, obras, laudos, onAbrir }: { open: boolean; onOpenChange: (open: boolean) => void; obras: ObraOption[]; laudos: LaudoLista[]; onAbrir: (obra: string, tipo: string) => void }) {
  const [obraId, setObraId] = useState('');
  const [tipo, setTipo] = useState<TipoRelatorio>('entrega_obra');
  const m = useRelatorioFinalMutations(null, null);
  const existente = laudos.find(r => r.obra_id === obraId && r.tipo_relatorio === tipo);
  const obra = obras.find(o => o.id === obraId);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Novo laudo</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <div className="space-y-2"><Label>Obra</Label><Select value={obraId} onValueChange={setObraId}><SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger><SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-3 sm:grid-cols-2">{(['entrega_obra','vistoria_previa'] as const).map(t => <Button key={t} variant="outline" aria-pressed={tipo === t} onClick={() => setTipo(t)} className={`h-auto items-start whitespace-normal p-4 text-left ${tipo === t ? 'border-accent bg-accent/5' : ''}`}>
        <div className="space-y-2"><div className="flex items-center gap-2">{t === 'entrega_obra' ? <FileText /> : <SearchCheck />}<span className="font-semibold">{tipoLaudo(t)}</span>{tipo === t && <Check className="text-accent" />}</div><p className="text-sm font-normal text-muted-foreground">{t === 'entrega_obra' ? 'Registro pré e pós-obra, garantia e aditivos.' : 'Registro por ambiente antes do início dos serviços.'}</p></div>
      </Button>)}</div>
      {existente && <p className="rounded-md border border-warning bg-warning/10 p-3 text-sm">Esta obra já tem um laudo de {tipoLaudo(tipo)} ({textoStatusLaudo(statusLaudo(existente))}). O sistema permite um por tipo em cada obra.</p>}
      <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!obra || m.criar.isPending} onClick={() => {
        if (!obra) return;
        if (existente) { onOpenChange(false); onAbrir(obra.id, tipo); return; }
        m.criar.mutate({ obra, tipo }, { onSuccess: r => { onOpenChange(false); onAbrir(r.obra, r.tipo); } });
      }}>{m.criar.isPending ? 'Criando...' : existente ? 'Abrir laudo existente' : 'Criar e começar'}</Button>
    </div>
  </DialogContent></Dialog>;
}