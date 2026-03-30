import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingDown, TrendingUp, FileText, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadPdf } from '@/lib/pdfDownload';
import { toast } from 'sonner';

interface ExtratoFinanceiroProps {
  receitas: any[];
  despesas: any[];
  filterObra: string;
}

interface ExtratoItem {
  data: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  obra: string;
  valor: number;
  saldo: number;
}

const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ExtratoFinanceiro({ receitas, despesas, filterObra }: ExtratoFinanceiroProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Build all entries sorted by date
  const allEntries = useMemo(() => {
    const entries: Omit<ExtratoItem, 'saldo'>[] = [];

    receitas.forEach(r => {
      entries.push({
        data: r.created_at?.split('T')[0] || '',
        tipo: 'receita',
        descricao: r.descricao,
        obra: r.obras?.nome || '—',
        valor: Number(r.valor_total),
      });
    });

    despesas.forEach(d => {
      entries.push({
        data: d.data,
        tipo: 'despesa',
        descricao: d.descricao,
        obra: d.obras?.nome || '—',
        valor: Number(d.valor),
      });
    });

    entries.sort((a, b) => a.data.localeCompare(b.data));
    return entries;
  }, [receitas, despesas]);

  // Split into before-period and in-period
  const { saldoAnterior, extrato, totalReceitas, totalDespesas } = useMemo(() => {
    let saldoAnterior = 0;
    const filtered: ExtratoItem[] = [];
    let totR = 0;
    let totD = 0;

    let runningBalance = 0;

    for (const entry of allEntries) {
      const amount = entry.tipo === 'receita' ? entry.valor : -entry.valor;

      const beforeStart = dataInicio && entry.data < dataInicio;
      const afterEnd = dataFim && entry.data > dataFim;

      if (beforeStart) {
        saldoAnterior += amount;
        continue;
      }
      if (afterEnd) continue;

      if (entry.tipo === 'receita') totR += entry.valor;
      else totD += entry.valor;

      runningBalance = saldoAnterior + totR - totD;
      filtered.push({ ...entry, saldo: runningBalance });
    }

    return { saldoAnterior, extrato: filtered, totalReceitas: totR, totalDespesas: totD };
  }, [allEntries, dataInicio, dataFim]);

  const saldoPeriodo = totalReceitas - totalDespesas;
  const saldoFinal = saldoAnterior + saldoPeriodo;

  const exportPdf = () => {
    if (extrato.length === 0) {
      toast.info('Nenhuma movimentação para exportar.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Extrato Financeiro', 14, 20);
    doc.setFontSize(10);

    let subtitleY = 28;
    if (dataInicio || dataFim) {
      const periodo = `Período: ${dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'início'} a ${dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'atual'}`;
      doc.text(periodo, 14, subtitleY);
      subtitleY += 6;
    }
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, subtitleY);
    subtitleY += 6;

    if (dataInicio) {
      doc.text(`Saldo anterior: ${fmt(saldoAnterior)}`, 14, subtitleY);
      subtitleY += 6;
    }

    doc.text(`Total Receitas: ${fmt(totalReceitas)} | Total Despesas: ${fmt(totalDespesas)} | Saldo: ${fmt(saldoPeriodo)}`, 14, subtitleY);
    subtitleY += 4;

    autoTable(doc, {
      startY: subtitleY + 4,
      head: [['Data', 'Tipo', 'Descrição', 'Obra', 'Valor', 'Saldo']],
      body: extrato.map(e => [
        new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        e.tipo === 'receita' ? 'Receita' : 'Despesa',
        e.descricao,
        e.obra,
        (e.tipo === 'receita' ? '+' : '-') + fmt(e.valor),
        fmt(e.saldo),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          const raw = data.cell.raw as string;
          data.cell.styles.textColor = raw.startsWith('+') ? [22, 163, 74] : [220, 38, 38];
        }
      },
    });

    downloadPdf(doc, 'extrato_financeiro.pdf');
    toast.success('Extrato exportado com sucesso!');
  };

  const clearFilters = () => {
    setDataInicio('');
    setDataFim('');
  };

  return (
    <div className="space-y-6">
      {/* Filtro por período */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
            </div>
            {(dataInicio || dataFim) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={exportPdf}>
                <FileText className="h-4 w-4 mr-1" /> Exportar Extrato PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {dataInicio && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Saldo Anterior</p>
              <p className={`text-xl font-display font-bold ${saldoAnterior < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {fmt(saldoAnterior)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Receitas do Período</p>
                <p className="text-xl font-display font-bold text-success">{fmt(totalReceitas)}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Despesas do Período</p>
                <p className="text-xl font-display font-bold text-destructive">{fmt(totalDespesas)}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Final</p>
                <p className={`text-xl font-display font-bold ${saldoFinal < 0 ? 'text-destructive' : 'text-success'}`}>
                  {fmt(saldoFinal)}
                </p>
              </div>
              <DollarSign className={`h-6 w-6 ${saldoFinal < 0 ? 'text-destructive' : 'text-success'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela extrato */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataInicio && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={4} className="text-sm font-medium text-muted-foreground">
                    Saldo anterior ao período
                  </TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className={`text-right font-bold ${saldoAnterior < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {fmt(saldoAnterior)}
                  </TableCell>
                </TableRow>
              )}
              {extrato.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">
                    {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.tipo === 'receita' ? 'default' : 'destructive'} className={item.tipo === 'receita' ? 'bg-success text-success-foreground' : ''}>
                      {item.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{item.descricao}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.obra}</TableCell>
                  <TableCell className={`text-right font-medium ${item.tipo === 'receita' ? 'text-success' : 'text-destructive'}`}>
                    {item.tipo === 'receita' ? '+' : '-'}{fmt(item.valor)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${item.saldo < 0 ? 'text-destructive' : ''}`}>
                    {fmt(item.saldo)}
                  </TableCell>
                </TableRow>
              ))}
              {extrato.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
