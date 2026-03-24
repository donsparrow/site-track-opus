import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Parcela {
  id: string;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  forma_pagamento: string | null;
}

export default function ObraDetail() {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra] = useState<any>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [financeiro, setFinanceiro] = useState({ contrato: 0, recebido: 0, aReceber: 0, gasto: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);

    const { data: obraData } = await supabase
      .from('obras')
      .select('*, clientes(nome)')
      .eq('id', id!)
      .single();
    setObra(obraData);

    // Receitas
    const { data: receitas } = await supabase.from('receitas').select('id, valor_total').eq('obra_id', id!);
    const totalContrato = (receitas || []).reduce((s, r) => s + Number(r.valor_total), 0);
    const receitaIds = (receitas || []).map(r => r.id);

    // Parcelas
    let allParcelas: Parcela[] = [];
    if (receitaIds.length > 0) {
      const { data } = await supabase
        .from('parcelas')
        .select('*')
        .in('receita_id', receitaIds)
        .order('data_vencimento');
      allParcelas = (data || []) as Parcela[];
    }

    // Check overdue
    const today = new Date().toISOString().split('T')[0];
    allParcelas = allParcelas.map(p => ({
      ...p,
      status: p.data_recebimento ? 'recebido' : (p.data_vencimento < today ? 'atrasado' : 'pendente')
    }));
    setParcelas(allParcelas);

    const totalRecebido = allParcelas.filter(p => p.status === 'recebido').reduce((s, p) => s + Number(p.valor), 0);
    const totalAReceber = allParcelas.filter(p => p.status !== 'recebido').reduce((s, p) => s + Number(p.valor), 0);

    // Despesas
    const { data: despesas } = await supabase.from('despesas').select('valor').eq('obra_id', id!);
    const totalGasto = (despesas || []).reduce((s, d) => s + Number(d.valor), 0);

    setFinanceiro({
      contrato: totalContrato,
      recebido: totalRecebido,
      aReceber: totalAReceber,
      gasto: totalGasto,
      saldo: totalRecebido - totalGasto,
    });

    setLoading(false);
  };

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const statusBadge = (status: string) => {
    if (status === 'recebido') return <Badge className="bg-success text-success-foreground">Recebido</Badge>;
    if (status === 'atrasado') return <Badge variant="destructive">Atrasado</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  if (!obra) return <p>Obra não encontrada</p>;

  const statusLabels: Record<string, string> = { planejamento: 'Planejamento', andamento: 'Em andamento', concluida: 'Concluída' };

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{obra.nome}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary">{statusLabels[obra.status] || obra.status}</Badge>
            {obra.clientes?.nome && <span className="text-sm text-muted-foreground">{obra.clientes.nome}</span>}
            {obra.endereco && <span className="text-sm text-muted-foreground">· {obra.endereco}</span>}
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Contrato', value: financeiro.contrato, icon: DollarSign, color: 'text-foreground' },
          { label: 'Recebido', value: financeiro.recebido, icon: TrendingUp, color: 'text-success' },
          { label: 'A Receber', value: financeiro.aReceber, icon: Wallet, color: 'text-warning' },
          { label: 'Gastos', value: financeiro.gasto, icon: TrendingDown, color: 'text-destructive' },
          { label: 'Saldo', value: financeiro.saldo, icon: DollarSign, color: financeiro.saldo < 0 ? 'text-destructive' : 'text-success' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-lg font-display font-bold ${item.color}`}>{fmt(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {financeiro.saldo < 0 && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          ⚠️ Atenção: Saldo negativo! Os gastos superam os recebimentos em {fmt(Math.abs(financeiro.saldo))}.
        </div>
      )}

      {/* Parcelas table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          {parcelas.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma parcela registrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((p) => (
                  <TableRow key={p.id} className={p.status === 'atrasado' ? 'bg-destructive/5' : ''}>
                    <TableCell>{p.numero_parcela}</TableCell>
                    <TableCell className="font-medium">{fmt(Number(p.valor))}</TableCell>
                    <TableCell>{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{p.data_recebimento ? new Date(p.data_recebimento).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="capitalize">{p.forma_pagamento || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
