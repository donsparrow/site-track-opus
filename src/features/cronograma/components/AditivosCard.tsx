import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Aditivo } from '../types';

interface Props {
  aditivos: Aditivo[];
  canEdit: boolean;
  onDelete: (id: string) => void;
}

export default function AditivosCard({ aditivos, canEdit, onDelete }: Props) {
  if (aditivos.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Aditivos da Obra ({aditivos.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-28">Dias Adicionais</TableHead>
                <TableHead className="w-32">Data Aprovação</TableHead>
                <TableHead>Responsável</TableHead>
                {canEdit && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {aditivos.map(ad => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{ad.descricao}</div>
                    {ad.justificativa && <div className="text-xs text-muted-foreground mt-0.5">{ad.justificativa}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">+{ad.dias_adicionais} dias</Badge></TableCell>
                  <TableCell className="text-xs">{ad.data_aprovacao ? format(parseISO(ad.data_aprovacao), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell className="text-xs">{ad.responsavel_aprovacao || '—'}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(ad.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
