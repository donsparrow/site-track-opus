import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Plus, TrendingUp, TrendingDown, DollarSign, AlertTriangle, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import NovaObraDialog from '@/components/NovaObraDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ObraResumo {
  id: string;
  nome: string;
  endereco: string | null;
  status: string;
  cliente_nome: string | null;
  total_receitas: number;
  total_despesas: number;
  total_recebido: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  planejamento: { label: 'Planejamento', variant: 'secondary' },
  andamento: { label: 'Em andamento', variant: 'default' },
  concluida: { label: 'Concluída', variant: 'default' },
};

const COLORS = ['hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--secondary))', '#6366f1'];

export default function Dashboard() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [diarioDialogOpen, setDiarioDialogOpen] = useState(false);
  const [selectedObraDiario, setSelectedObraDiario] = useState('');
  const [despesasPorTipo, setDespesasPorTipo] = useState<any[]>([]);
  const [evolucaoMensal, setEvolucaoMensal] = useState<any[]>([]);
  const [parcelasAtrasadas, setParcelasAtrasadas] = useState(0);

  const fetchObras = async () => {
    setLoading(true);
    const { data: obrasData } = await supabase
      .from('obras')
      .select('id, nome, endereco, status, clientes(nome)')
      .order('created_at', { ascending: false });

    if (!obrasData) { setLoading(false); return; }

    // Filter obras based on user access
    const filteredObras = filterObras(obrasData as any[]);
    const obraIds = filteredObras.map((o: any) => o.id);
    if (obraIds.length === 0) {
      setObras([]);
      setLoading(false);
      return;
    }

    const { data: allReceitas } = await supabase.from('receitas').select('id, valor_total, obra_id').in('obra_id', obraIds);
    const { data: allDespesas } = await supabase.from('despesas').select('valor, obra_id, tipo, data').in('obra_id', obraIds);

    const receitaIds = (allReceitas || []).map(r => r.id);
    let allParcelas: any[] = [];
    if (receitaIds.length > 0) {
      const { data } = await supabase.from('parcelas').select('valor, status, receita_id, data_vencimento, data_recebimento').in('receita_id', receitaIds);
      allParcelas = data || [];
    }

    // Count late parcels
    const today = new Date().toISOString().split('T')[0];
    const late = allParcelas.filter(p => !p.data_recebimento && p.data_vencimento < today).length;
    setParcelasAtrasadas(late);

    // Build obra summaries
    const obrasComResumo: ObraResumo[] = filteredObras.map((obra: any) => {
      const obraReceitas = (allReceitas || []).filter(r => r.obra_id === obra.id);
      const obraReceitaIds = obraReceitas.map(r => r.id);
      const obraDespesas = (allDespesas || []).filter(d => d.obra_id === obra.id);
      const obraParcelas = allParcelas.filter(p => obraReceitaIds.includes(p.receita_id));

      return {
        id: obra.id,
        nome: obra.nome,
        endereco: obra.endereco,
        status: obra.status,
        cliente_nome: obra.clientes?.nome || null,
        total_receitas: obraReceitas.reduce((s, r) => s + Number(r.valor_total), 0),
        total_despesas: obraDespesas.reduce((s, d) => s + Number(d.valor), 0),
        total_recebido: obraParcelas.filter(p => p.data_recebimento).reduce((s, p) => s + Number(p.valor), 0),
      };
    });

    setObras(obrasComResumo);

    // Expense by type chart
    const tipoMap: Record<string, number> = {};
    const tipoLabels: Record<string, string> = { material: 'Material', mao_obra: 'Mão de Obra', ferramenta: 'Ferramenta', manutencao: 'Manutenção', outros: 'Outros' };
    (allDespesas || []).forEach(d => {
      const label = tipoLabels[d.tipo] || d.tipo;
      tipoMap[label] = (tipoMap[label] || 0) + Number(d.valor);
    });
    setDespesasPorTipo(Object.entries(tipoMap).map(([name, value]) => ({ name, value })));

    // Monthly evolution
    const mesesMap: Record<string, { receitas: number; despesas: number }> = {};
    (allReceitas || []).forEach(r => {
      // use current month as approximation
    });
    (allDespesas || []).forEach(d => {
      const m = d.data?.slice(0, 7);
      if (m) {
        if (!mesesMap[m]) mesesMap[m] = { receitas: 0, despesas: 0 };
        mesesMap[m].despesas += Number(d.valor);
      }
    });
    allParcelas.forEach(p => {
      if (p.data_recebimento) {
        const m = p.data_recebimento.slice(0, 7);
        if (!mesesMap[m]) mesesMap[m] = { receitas: 0, despesas: 0 };
        mesesMap[m].receitas += Number(p.valor);
      }
    });
    const sortedMonths = Object.entries(mesesMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    setEvolucaoMensal(sortedMonths.map(([mes, vals]) => ({
      mes: new Date(mes + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      Receitas: vals.receitas,
      Despesas: vals.despesas,
    })));

    setLoading(false);
  };

  useEffect(() => { if (!obrasFilterLoading) fetchObras(); }, [obrasFilterLoading]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalGeral = obras.reduce((s, o) => s + o.total_receitas, 0);
  const totalRecebidoGeral = obras.reduce((s, o) => s + o.total_recebido, 0);
  const totalGastoGeral = obras.reduce((s, o) => s + o.total_despesas, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral das suas obras</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (obras.length === 1) {
                  navigate(`/diario?obra=${obras[0].id}`);
                } else {
                  setSelectedObraDiario('');
                  setDiarioDialogOpen(true);
                }
              }}
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base px-[23px] mx-[3px]"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              Criar Diário
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Obra
            </Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contratos</p>
                <p className="text-2xl font-display font-bold">{formatCurrency(totalGeral)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-display font-bold text-success">{formatCurrency(totalRecebidoGeral)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gastos</p>
                <p className="text-2xl font-display font-bold text-destructive">{formatCurrency(totalGastoGeral)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parcelas Atrasadas</p>
                <p className={`text-2xl font-display font-bold ${parcelasAtrasadas > 0 ? 'text-destructive' : 'text-foreground'}`}>{parcelasAtrasadas}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${parcelasAtrasadas > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {(despesasPorTipo.length > 0 || evolucaoMensal.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {despesasPorTipo.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Despesas por Tipo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={despesasPorTipo} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {despesasPorTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {evolucaoMensal.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Evolução Mensal</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={evolucaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Legend />
                    <Bar dataKey="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Obras list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : obras.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma obra cadastrada</p>
            {canEdit && (
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Criar primeira obra
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {obras.map((obra) => {
            const saldo = obra.total_recebido - obra.total_despesas;
            return (
              <Link key={obra.id} to={`/obras/${obra.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-display">{obra.nome}</CardTitle>
                      <Badge variant={statusConfig[obra.status]?.variant || 'secondary'}>
                        {statusConfig[obra.status]?.label || obra.status}
                      </Badge>
                    </div>
                    {obra.cliente_nome && (
                      <p className="text-sm text-muted-foreground">{obra.cliente_nome}</p>
                    )}
                    {obra.endereco && (
                      <p className="text-xs text-muted-foreground">{obra.endereco}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Contrato</p>
                        <p className="font-semibold">{formatCurrency(obra.total_receitas)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recebido</p>
                        <p className="font-semibold text-success">{formatCurrency(obra.total_recebido)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gastos</p>
                        <p className="font-semibold text-destructive">{formatCurrency(obra.total_despesas)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saldo</p>
                        <p className={`font-semibold ${saldo < 0 ? 'text-destructive' : 'text-success'}`}>
                          {formatCurrency(saldo)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Diário dialog - select obra */}
      <Dialog open={diarioDialogOpen} onOpenChange={setDiarioDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Obra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select value={selectedObraDiario} onValueChange={setSelectedObraDiario}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a obra" />
                </SelectTrigger>
                <SelectContent>
                  {obras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={!selectedObraDiario}
              onClick={() => {
                setDiarioDialogOpen(false);
                navigate(`/diario?obra=${selectedObraDiario}`);
              }}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Criar Diário
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NovaObraDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchObras} />

      {/* Mobile floating button */}
      {canEdit && (
        <Button
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 md:hidden p-0"
          onClick={() => {
            if (obras.length === 1) {
              navigate(`/diario?obra=${obras[0].id}`);
            } else {
              setSelectedObraDiario('');
              setDiarioDialogOpen(true);
            }
          }}
        >
          <ClipboardList className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
