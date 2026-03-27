import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Wallet, Check, ClipboardList, FileText, Edit2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import NovaReceitaDialog from '@/components/NovaReceitaDialog';
import NovaDespesaDialog from '@/components/NovaDespesaDialog';
import AnotacoesObra from '@/components/AnotacoesObra';

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
  const { canEdit, role } = useAuth();
  const [obra, setObra] = useState<any>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [financeiro, setFinanceiro] = useState({ contrato: 0, recebido: 0, aReceber: 0, gasto: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [receitaOpen, setReceitaOpen] = useState(false);
  const [despesaOpen, setDespesaOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Edit form
  const [editStatus, setEditStatus] = useState('');
  const [editDataInicio, setEditDataInicio] = useState('');
  const [editDataFim, setEditDataFim] = useState('');
  const [editEndereco, setEditEndereco] = useState('');
  const [editResponsavel, setEditResponsavel] = useState('');

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

    if (obraData) {
      setEditStatus(obraData.status);
      setEditDataInicio(obraData.data_inicio || '');
      setEditDataFim(obraData.data_fim_prevista || '');
      setEditEndereco(obraData.endereco || '');
      setEditResponsavel(obraData.responsavel || '');
    }

    const { data: receitas } = await supabase.from('receitas').select('id, valor_total').eq('obra_id', id!);
    const totalContrato = (receitas || []).reduce((s, r) => s + Number(r.valor_total), 0);
    const receitaIds = (receitas || []).map(r => r.id);

    let allParcelas: Parcela[] = [];
    if (receitaIds.length > 0) {
      const { data } = await supabase
        .from('parcelas')
        .select('*')
        .in('receita_id', receitaIds)
        .order('data_vencimento');
      allParcelas = (data || []) as Parcela[];
    }

    const today = new Date().toISOString().split('T')[0];
    allParcelas = allParcelas.map(p => ({
      ...p,
      status: p.data_recebimento ? 'recebido' : (p.data_vencimento < today ? 'atrasado' : 'pendente')
    }));
    setParcelas(allParcelas);

    const totalRecebido = allParcelas.filter(p => p.status === 'recebido').reduce((s, p) => s + Number(p.valor), 0);
    const totalAReceber = allParcelas.filter(p => p.status !== 'recebido').reduce((s, p) => s + Number(p.valor), 0);

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

  const registrarPagamento = async (parcelaId: string, formaPagamento: string) => {
    const { error } = await supabase
      .from('parcelas')
      .update({
        data_recebimento: new Date().toISOString().split('T')[0],
        status: 'recebido',
        forma_pagamento: formaPagamento,
      })
      .eq('id', parcelaId);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Pagamento registrado!');
      fetchData();
    }
  };

  const handleEditObra = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('obras').update({
      status: editStatus,
      data_inicio: editDataInicio || null,
      data_fim_prevista: editDataFim || null,
      endereco: editEndereco || null,
      responsavel: editResponsavel || null,
    }).eq('id', id!);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Obra atualizada!');
      setEditOpen(false);
      fetchData();
    }
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
  const atrasadas = parcelas.filter(p => p.status === 'atrasado').length;

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{obra.nome}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Badge variant="secondary">{statusLabels[obra.status] || obra.status}</Badge>
            {obra.clientes?.nome && <span className="text-sm text-muted-foreground">{obra.clientes.nome}</span>}
            {obra.endereco && <span className="text-sm text-muted-foreground">· {obra.endereco}</span>}
            {obra.data_inicio && (
              <span className="text-sm text-muted-foreground">
                · {new Date(obra.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                {obra.data_fim_prevista && ` a ${new Date(obra.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4 mr-1" /> Editar
            </Button>
          )}
          <Link to={`/diario?obra=${id}`}>
            <Button variant="outline" size="sm">
              <ClipboardList className="h-4 w-4 mr-1" /> Diário
            </Button>
          </Link>
          <Link to={`/relatorios?obra=${id}`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" /> Relatório
            </Button>
          </Link>
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

      {atrasadas > 0 && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          ⏰ {atrasadas} parcela{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}!
        </div>
      )}

      {/* Action buttons */}
      {canEdit && (
        <div className="flex gap-3 mb-6">
          <Button onClick={() => setReceitaOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
            <TrendingUp className="h-4 w-4 mr-1" /> Nova Receita
          </Button>
          <Button onClick={() => setDespesaOpen(true)} variant="outline" size="sm">
            <TrendingDown className="h-4 w-4 mr-1" /> Nova Despesa
          </Button>
        </div>
      )}

      {/* Parcelas table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          {parcelas.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma parcela registrada. Adicione uma receita para gerar parcelas automaticamente.</p>
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
                  {canEdit && <TableHead>Ação</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((p) => (
                  <TableRow key={p.id} className={p.status === 'atrasado' ? 'bg-destructive/5' : ''}>
                    <TableCell>{p.numero_parcela}</TableCell>
                    <TableCell className="font-medium">{fmt(Number(p.valor))}</TableCell>
                    <TableCell>{new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{p.data_recebimento ? new Date(p.data_recebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="capitalize">{p.forma_pagamento || '—'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        {p.status !== 'recebido' && (
                          <ParcelaPayAction onPay={(forma) => registrarPagamento(p.id, forma)} />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Obra Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Editar Obra</DialogTitle></DialogHeader>
          <form onSubmit={handleEditObra} className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejamento">Planejamento</SelectItem>
                  <SelectItem value="andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Endereço</Label><Input value={editEndereco} onChange={e => setEditEndereco(e.target.value)} /></div>
            <div><Label>Responsável</Label><Input value={editResponsavel} onChange={e => setEditResponsavel(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data de Início</Label><Input type="date" value={editDataInicio} onChange={e => setEditDataInicio(e.target.value)} /></div>
              <div><Label>Previsão de Término</Label><Input type="date" value={editDataFim} onChange={e => setEditDataFim(e.target.value)} /></div>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <NovaReceitaDialog open={receitaOpen} onOpenChange={setReceitaOpen} onCreated={fetchData} />
      <NovaDespesaDialog open={despesaOpen} onOpenChange={setDespesaOpen} onCreated={fetchData} />
    </div>
  );
}

function ParcelaPayAction({ onPay }: { onPay: (forma: string) => void }) {
  const [forma, setForma] = useState('pix');
  return (
    <div className="flex items-center gap-2">
      <Select value={forma} onValueChange={setForma}>
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pix">Pix</SelectItem>
          <SelectItem value="boleto">Boleto</SelectItem>
          <SelectItem value="transferencia">Transferência</SelectItem>
          <SelectItem value="dinheiro">Dinheiro</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-8" onClick={() => onPay(forma)}>
        <Check className="h-3 w-3 mr-1" /> Receber
      </Button>
    </div>
  );
}
