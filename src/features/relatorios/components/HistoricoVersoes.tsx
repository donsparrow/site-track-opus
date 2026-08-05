import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { RelatorioVersao } from '../types';
import { revLabel } from '../utils';

interface Props {
  versoes: RelatorioVersao[];
  nomesUsuarios: Record<string, string>;
  loading: boolean;
}

export default function HistoricoVersoes({ versoes, nomesUsuarios, loading }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : versoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma versão</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>REV</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Resumo das Alterações</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versoes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-bold">{revLabel(v.numero_versao - 1)}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === 'assinado' ? 'default' : v.status === 'finalizado' ? 'secondary' : 'outline'}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{nomesUsuarios[v.criado_por] || '—'}</TableCell>
                  <TableCell>{v.descricao_alteracao || '—'}</TableCell>
                  <TableCell>{new Date(v.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
