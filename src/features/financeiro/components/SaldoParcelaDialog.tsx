import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParcelas } from '../hooks/useParcelas';
import { fmt } from '../utils';
import { saldoNaoParcelado, TOLERANCIA, vencimentoSugerido } from '../parcelasCalc';

interface Props {
  receitaId: string | null;
  valorTotal: number;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onCriar: (values: { valor: number; data_vencimento: string; numero_parcela: number; quantidade: number }) => void;
}

export default function SaldoParcelaDialog({ receitaId, valorTotal, pending, onOpenChange, onCriar }: Props) {
  const { parcelas, isFetching } = useParcelas(receitaId);
  const saldo = saldoNaoParcelado(valorTotal, parcelas.map((p) => Number(p.valor)));
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');

  useEffect(() => {
    if (!receitaId || isFetching) return;
    setValor(saldo.toFixed(2));
    setVencimento(vencimentoSugerido(parcelas.map((p) => p.data_vencimento)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitaId, isFetching, saldo]);

  const v = parseFloat(valor);
  const acima = v > saldo + TOLERANCIA;
  const invalido = !(v > 0) || acima || !vencimento;

  return (
    <Dialog open={!!receitaId} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Saldo sem parcela</DialogTitle>
          <DialogDescription>
            Ficou um saldo de {fmt(saldo)} sem parcela. Deseja criar uma nova parcela com esse valor?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min="0.01" max={saldo} value={valor} onChange={(e) => setValor(e.target.value)} />
            {acima && <p className="text-sm text-destructive mt-1">O valor não pode passar do saldo de {fmt(saldo)}.</p>}
          </div>
          <div>
            <Label>Vencimento</Label>
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Agora não</Button>
            <Button
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={invalido || pending || isFetching}
              onClick={() =>
                onCriar({
                  valor: Math.round(v * 100) / 100,
                  data_vencimento: vencimento,
                  numero_parcela: Math.max(0, ...parcelas.map((p) => p.numero_parcela)) + 1,
                  quantidade: parcelas.length + 1,
                })
              }
            >
              {pending ? 'Criando...' : 'Criar parcela'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
