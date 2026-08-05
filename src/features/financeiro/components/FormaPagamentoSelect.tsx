import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function FormaPagamentoSelect({ value, onChange, label = 'Forma de Pagamento' }: Props) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pix">PIX</SelectItem>
          <SelectItem value="boleto">Boleto</SelectItem>
          <SelectItem value="transferencia">Transferência</SelectItem>
          <SelectItem value="cartao">Cartão</SelectItem>
          <SelectItem value="dinheiro">Dinheiro</SelectItem>
          <SelectItem value="outros">Outros</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
