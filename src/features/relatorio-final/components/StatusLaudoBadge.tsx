import { Badge } from '@/components/ui/badge';
import { textoStatusLaudo, type StatusLaudo } from '../lib/status';
export default function StatusLaudoBadge({ status, externo = false }: { status: StatusLaudo; externo?: boolean }) {
  return <Badge className="whitespace-normal" variant={status === 'rascunho' ? 'secondary' : status === 'aguardando' ? 'warning' : 'success'}>{textoStatusLaudo(status, externo)}</Badge>;
}