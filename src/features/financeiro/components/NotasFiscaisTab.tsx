import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Eye, FileText, Paperclip } from 'lucide-react';
import type { AnexoPreviewTarget } from '@/components/AnexoPreviewDialog';
import { downloadAnexo } from '../anexoDownload';
import { fmt, fmtData } from '../utils';
import type { DespesaComObra, FinanceiroAnexo, ReceitaComObra } from '../types';

interface Props {
  anexos: FinanceiroAnexo[];
  receitas: ReceitaComObra[];
  despesas: DespesaComObra[];
  onExportar: () => void;
  onPreviewAnexo: (target: AnexoPreviewTarget) => void;
}

export default function NotasFiscaisTab({ anexos, receitas, despesas, onExportar, onPreviewAnexo }: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-display font-semibold">Documentos Anexados</h2>
        <Button variant="outline" size="sm" onClick={onExportar}>
          <FileText className="h-4 w-4 mr-1" /> Exportar PDF
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo Doc</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anexos.map((a) => {
                const receita = receitas.find((r) => r.id === a.registro_id);
                const despesa = despesas.find((d) => d.id === a.registro_id);
                if (!receita && !despesa) return null;
                const isReceita = a.tipo_registro === 'receita';
                const valor = isReceita ? Number(receita?.valor_total || 0) : Number(despesa?.valor || 0);
                const data = isReceita ? receita?.created_at?.split('T')[0] : despesa?.data;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant={isReceita ? 'default' : 'secondary'}>{isReceita ? 'Receita' : 'Despesa'}</Badge>
                    </TableCell>
                    <TableCell>{(receita || despesa)?.obras?.nome || '—'}</TableCell>
                    <TableCell className="font-medium">{(receita || despesa)?.descricao || '—'}</TableCell>
                    <TableCell>{fmt(valor)}</TableCell>
                    <TableCell>{fmtData(data)}</TableCell>
                    <TableCell className="flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[150px]" title={a.nome_arquivo}>{a.nome_arquivo}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.tipo_anexo === 'nota_fiscal' ? '📄 Nota Fiscal' : '💳 Boleto'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Visualizar"
                          onClick={() => onPreviewAnexo({ url: a.url_arquivo, nome: a.nome_arquivo, tipo: a.tipo_anexo })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Baixar"
                          onClick={() => downloadAnexo(a.url_arquivo, a.nome_arquivo)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {anexos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum documento anexado encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
