import { lazy, Suspense, useRef, useState } from 'react';
import type SignatureCanvasType from 'react-signature-canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

/** Canvas de assinatura carregado sob demanda (só ao abrir o diálogo). */
const SignatureCanvas = lazy(() => import('react-signature-canvas'));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onConfirm: (values: { dataUrl: string; nome: string; cargo: string; tipo: string }) => void;
}

export default function AssinarDialog({ open, onOpenChange, saving, onConfirm }: Props) {
  const sigRef = useRef<SignatureCanvasType>(null);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [tipo, setTipo] = useState('responsavel_tecnico');

  const handleConfirm = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { toast.error('Desenhe sua assinatura'); return; }
    if (!nome) return;
    onConfirm({ dataUrl: sigRef.current.toDataURL('image/png'), nome, cargo, tipo });
    setNome(''); setCargo('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">Assinatura Digital</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
          <div><Label>Cargo</Label><Input value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="responsavel_tecnico">Responsável Técnico</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Desenhe sua assinatura</Label>
            <div className="border rounded-lg bg-white">
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{ className: 'w-full h-40', style: { width: '100%', height: '160px' } }}
                  penColor="black"
                />
              </Suspense>
            </div>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => sigRef.current?.clear()}>Limpar</Button>
          </div>
          <Button onClick={handleConfirm} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!nome || saving}>
            {saving ? 'Registrando...' : 'Confirmar Assinatura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
