import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DadosRelatorio } from '../types';
import { fmt } from '../utils';

interface ParalisacaoItem {
  motivo: string;
  data_inicio: string;
  data_fim: string | null;
  total_dias: number | null;
}
interface OcorrenciaItem { descricao: string; impacto: string }

const impactoVariant = (impacto: string): 'destructive' | 'secondary' | 'outline' =>
  impacto === 'alto' ? 'destructive' : impacto === 'medio' ? 'secondary' : 'outline';

export default function RegistrosTab({ dados }: { dados: DadosRelatorio }) {
  const paralisacoes = (dados.paralisacoes || []) as ParalisacaoItem[];
  const ocorrencias = (dados.ocorrencias || []) as OcorrenciaItem[];

  const totalDias = paralisacoes.reduce((s, p) => s + (p.total_dias || 0), 0);
  const emAberto = paralisacoes.filter((p) => !p.data_fim).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Paralisações</p>
          <p className="text-2xl font-bold font-display">{paralisacoes.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Dias Parados</p>
          <p className="text-2xl font-bold font-display">{totalDias}</p>
          <p className="text-[10px] text-muted-foreground">Compõe o Controle de Prazo</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Em Aberto</p>
          <p className="text-2xl font-bold font-display">{emAberto}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Ocorrências</p>
          <p className="text-2xl font-bold font-display">{ocorrencias.length}</p>
          <p className="text-[10px] text-destructive">
            {ocorrencias.filter((o) => o.impacto === 'alto').length} alto impacto
          </p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm font-display">Paralisações</CardTitle></CardHeader>
        <CardContent>
          {paralisacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Não houve paralisações registradas no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-28">Início</TableHead>
                    <TableHead className="w-32">Término</TableHead>
                    <TableHead className="w-16 text-right">Dias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paralisacoes.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{p.motivo || '—'}</TableCell>
                      <TableCell className="text-sm data-tech">{p.data_inicio ? fmt(p.data_inicio) : '—'}</TableCell>
                      <TableCell className="text-sm data-tech">
                        {p.data_fim ? fmt(p.data_fim) : <Badge variant="secondary" className="text-[10px]">Em aberto</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-right data-tech">{p.total_dias ?? 0}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold text-sm">Total</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell className="font-semibold text-sm text-right data-tech">{totalDias}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm font-display">Ocorrências</CardTitle></CardHeader>
        <CardContent>
          {ocorrencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-28">Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ocorrencias.map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{o.descricao || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={impactoVariant(o.impacto)} className="text-[10px] capitalize">
                          {o.impacto || '—'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
