import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ObrasChecklist from './ObrasChecklist';
import { useUsuariosMutations } from '../hooks/useUsuariosMutations';
import type { ObraOption, UsuarioMerged } from '../types';

interface Props {
  usuario: UsuarioMerged | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obras: ObraOption[];
}

export default function VincularObrasDialog({ usuario, open, onOpenChange, obras }: Props) {
  const { salvarVinculoObras } = useUsuariosMutations();
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    if (!usuario || !open) return;
    setSelecionadas((usuario.obras_vinculadas || []).map((l) => l.obra_id));
  }, [usuario, open]);

  if (!usuario) return null;

  const toggleObra = (obraId: string) => {
    setSelecionadas((prev) => prev.includes(obraId) ? prev.filter((id) => id !== obraId) : [...prev, obraId]);
  };

  const handleSubmit = () => {
    salvarVinculoObras.mutate(
      { userId: usuario.user_id, obraIds: selecionadas },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Obras — {usuario.nome}</DialogTitle>
        </DialogHeader>
        <div className="border rounded-md p-3 max-h-64 overflow-y-auto space-y-2">
          <ObrasChecklist obras={obras} selecionadas={selecionadas} onToggle={toggleObra} />
        </div>
        <Button onClick={handleSubmit} disabled={salvarVinculoObras.isPending} className="w-full">
          {salvarVinculoObras.isPending ? 'Salvando...' : 'Salvar Vinculações'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
