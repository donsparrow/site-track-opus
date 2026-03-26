import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Plus, DollarSign, TrendingDown } from 'lucide-react';
import NovaReceitaDialog from '@/components/NovaReceitaDialog';
import NovaDespesaDialog from '@/components/NovaDespesaDialog';

export default function Financeiro() {
  const { canEdit } = useAuth();
  const [receitas, setReceitas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [expandedReceita, setExpandedReceita] = useState<string | null>(null);
  const [parcelas, setParcelas] = useState<Record<string, any[]>>({});
  const [receitaOpen, setReceitaOpen] = useState(false);
  const [despesaOpen, setDespesaOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [obras, setObras] = useState<any[]>([]);
  const [filterObra, setFilterObra] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    const { data: obrasData } = await supabase.from('obras').select('id, nome').order('nome');
    setObras(obrasData || []);

    let rQuery = supabase.from('receitas').select('*, obras(nome)').order('created_at', { ascending: false });
    let dQuery = supabase.from('despesas').select('*, obras(nome)').order('data', { ascending: false });

    if (filterObra !== 'all') {
      rQuery = rQuery.eq('obra_id', filterObra);
      dQuery = dQuery.eq('obra_id', filterObra);
    }

    const { data: r } = await rQuery;
    setReceitas(r || []);

    const { data: d } = await dQuery;
    setDespesas(d || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterObra]);

  const toggleReceita = async (receitaId: string) => {
    if (expandedReceita === receitaId) {
      setExpandedReceita(null);
      return;
    }
    if (!parcelas[receitaId]) {
      const { data } = await supabase.from('parcelas').select('*').eq('receita_id', receitaId).order('numero_parcela');
      setParcelas(prev => ({ ...prev, [receitaId]: data || [] }));
    }
    setExpandedReceita(receitaId);
  };

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const tipoLabels: Record<string, string> = {
    material: 'Material', mao_obra: 'Mão de obra', ferramenta: 'Ferramenta', manutencao: 'Manutenção', outros: 'Outros'
  };

  const totalReceitas = receitas.reduce((s, r) => s + Number(r.valor_total), 0);
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-6">Financeiro</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Receitas</p>
                <p className="text-2xl font-display font-bold text-success">{fmt(totalReceitas)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Despesas</p>
                <p className="text-2xl font-display font-bold text-destructive">{fmt(totalDespesas)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-display font-bold ${saldo < 0 ? 'text-destructive' : 'text-success'}`}>{fmt(saldo)}</p>
              </div>
              <DollarSign className={`h-8 w-8 ${saldo < 0 ? 'text-destructive' : 'text-success'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6 max-w-xs">
        <Select value={filterObra} onValueChange={setFilterObra}>
          <SelectTrigger><SelectValue placeholder="Filtrar por obra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="receitas">
        <TabsList className="mb-6">
          <TabsTrigger value="receitas">Receitas ({receitas.length})</TabsTrigger>
          <TabsTrigger value="despesas">Despesas ({despesas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-semibold">Receitas</h2>
            {canEdit && (
              <Button onClick={() => setReceitaOpen(true)} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Nova Receita
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Parcelas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitas.map((r) => (
                    <>
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => toggleReceita(r.id)}>
                        <TableCell>
                          {expandedReceita === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{r.descricao}</TableCell>
                        <TableCell>{r.obras?.nome || '—'}</TableCell>
                        <TableCell className="text-success font-medium">{fmt(Number(r.valor_total))}</TableCell>
                        <TableCell className="capitalize">{r.forma_pagamento}</TableCell>
                        <TableCell>{r.numero_parcelas}x</TableCell>
                      </TableRow>
                      {expandedReceita === r.id && parcelas[r.id] && (
                        <TableRow key={`${r.id}-parcelas`}>
                          <TableCell colSpan={6} className="bg-muted/50 p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nº</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Vencimento</TableHead>
                                  <TableHead>Recebimento</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {parcelas[r.id].map((p: any) => {
                                  const today = new Date().toISOString().split('T')[0];
                                  const st = p.data_recebimento ? 'recebido' : (p.data_vencimento < today ? 'atrasado' : 'pendente');
                                  return (
                                    <TableRow key={p.id} className={st === 'atrasado' ? 'bg-destructive/5' : ''}>
                                      <TableCell>{p.numero_parcela}</TableCell>
                                      <TableCell>{fmt(Number(p.valor))}</TableCell>
                                      <TableCell>{new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                                      <TableCell>{p.data_recebimento ? new Date(p.data_recebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                                      <TableCell>
                                        {st === 'recebido' && <Badge className="bg-success text-success-foreground">Recebido</Badge>}
                                        {st === 'atrasado' && <Badge variant="destructive">Atrasado</Badge>}
                                        {st === 'pendente' && <Badge variant="secondary">Pendente</Badge>}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                  {receitas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma receita cadastrada</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-semibold">Despesas</h2>
            {canEdit && (
              <Button onClick={() => setDespesaOpen(true)} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Nova Despesa
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.descricao}</TableCell>
                      <TableCell>{d.obras?.nome || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{tipoLabels[d.tipo] || d.tipo}</Badge></TableCell>
                      <TableCell className="text-destructive font-medium">{fmt(Number(d.valor))}</TableCell>
                      <TableCell>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="capitalize">{d.forma_pagamento || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {despesas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma despesa cadastrada</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovaReceitaDialog open={receitaOpen} onOpenChange={setReceitaOpen} onCreated={fetchData} />
      <NovaDespesaDialog open={despesaOpen} onOpenChange={setDespesaOpen} onCreated={fetchData} />
    </div>
  );
}
