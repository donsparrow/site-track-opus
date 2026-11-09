import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import { useAguardandoAssinatura } from '../hooks/useAguardandoAssinatura';
import ListaExpansivel, { tituloComTotal } from './ListaExpansivel';
import { fmtDataCurta } from '../utils';

/** Só aparece quando houver documentos aguardando a assinatura do usuário. */
export default function AguardandoAssinaturaCard({ obraId, podeLaudos }: { obraId: string; podeLaudos: boolean }) {
  const navigate = useNavigate();
  const { data = [] } = useAguardandoAssinatura(obraId, podeLaudos);
  if (data.length === 0) return null;

  return (
    <Card className="border-2 border-warning">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2"><PenLine className="h-4 w-4 text-warning" /> {tituloComTotal('Aguardando sua assinatura', data.length)}</CardTitle>
      </CardHeader>
      <CardContent>
        <ListaExpansivel itens={data} as="div" className="space-y-2" render={(it) => (
          <div key={`${it.origem}-${it.id}`} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium break-words">{it.titulo}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{it.origem === 'relatorios' ? 'Relatórios' : 'Laudos Técnicos'}</Badge>
                <span>{fmtDataCurta(it.data)}</span>
              </div>
            </div>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate(it.link)}>Ver e assinar</Button>
          </div>
        )} />
      </CardContent>
    </Card>
  );
}
