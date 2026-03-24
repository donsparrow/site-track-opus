import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NovaObraDialog from '@/components/NovaObraDialog';

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

export default function Dashboard() {
  const { canEdit } = useAuth();
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchObras = async () => {
    setLoading(true);
    const { data: obrasData } = await supabase
      .from('obras')
      .select('id, nome, endereco, status, clientes(nome)')
      .order('created_at', { ascending: false });

    if (!obrasData) { setLoading(false); return; }

    const obrasComResumo: ObraResumo[] = await Promise.all(
      obrasData.map(async (obra: any) => {
        const { data: receitas } = await supabase
          .from('receitas')
          .select('valor_total')
          .eq('obra_id', obra.id);

        const { data: despesas } = await supabase
          .from('despesas')
          .select('valor')
          .eq('obra_id', obra.id);

        const { data: parcelas } = await supabase
          .from('parcelas')
          .select('valor, status, receita_id')
          .eq('status', 'recebido');

        // Filter parcelas that belong to this obra's receitas
        const receitaIds = (receitas || []).map(() => obra.id);
        const totalReceitas = (receitas || []).reduce((s: number, r: any) => s + Number(r.valor_total), 0);
        const totalDespesas = (despesas || []).reduce((s: number, d: any) => s + Number(d.valor), 0);

        // Get parcelas for this obra
        const { data: obraReceitas } = await supabase
          .from('receitas')
          .select('id')
          .eq('obra_id', obra.id);
        const obraReceitaIds = (obraReceitas || []).map((r: any) => r.id);

        let totalRecebido = 0;
        if (obraReceitaIds.length > 0) {
          const { data: parcelasRecebidas } = await supabase
            .from('parcelas')
            .select('valor')
            .in('receita_id', obraReceitaIds)
            .eq('status', 'recebido');
          totalRecebido = (parcelasRecebidas || []).reduce((s: number, p: any) => s + Number(p.valor), 0);
        }

        return {
          id: obra.id,
          nome: obra.nome,
          endereco: obra.endereco,
          status: obra.status,
          cliente_nome: obra.clientes?.nome || null,
          total_receitas: totalReceitas,
          total_despesas: totalDespesas,
          total_recebido: totalRecebido,
        };
      })
    );

    setObras(obrasComResumo);
    setLoading(false);
  };

  useEffect(() => { fetchObras(); }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalGeral = obras.reduce((s, o) => s + o.total_receitas, 0);
  const totalRecebidoGeral = obras.reduce((s, o) => s + o.total_recebido, 0);
  const totalGastoGeral = obras.reduce((s, o) => s + o.total_despesas, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral das suas obras</p>
        </div>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Obra
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      </div>

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

      <NovaObraDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchObras} />
    </div>
  );
}
