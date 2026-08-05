import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Wrench } from 'lucide-react';
import type { FerramentaHistorico } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historico: FerramentaHistorico[];
}

export default function HistoricoDialog({ open, onOpenChange, historico }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico da Ferramenta</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-3 pt-2">
          {historico.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum registro</p>
          ) : (
            historico.map((h) => (
              <div key={h.id} className="flex items-start gap-3 border-b border-border pb-3">
                <div className="mt-1">
                  {h.tipo_evento === 'manutencao' ? (
                    <Wrench className="h-4 w-4 text-yellow-500" />
                  ) : h.tipo_evento === 'movimentacao' ? (
                    <History className="h-4 w-4 text-blue-500" />
                  ) : (
                    <History className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{h.descricao}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
