import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarClock } from 'lucide-react';
import CadastroTab from '@/features/funcionarios/components/CadastroTab';
import PontoTab from '@/features/funcionarios/components/PontoTab';
import LancamentosTab from '@/features/funcionarios/components/LancamentosTab';
import FechamentosTab from '@/features/funcionarios/components/FechamentosTab';
import { useFuncionarios, useFuncionariosMutations, useObrasFuncionarios } from '@/features/funcionarios/hooks/useFuncionarios';
import { usePonto, usePontoMutations } from '@/features/funcionarios/hooks/usePonto';
import { useLancamentos, useLancamentosMutations } from '@/features/funcionarios/hooks/useLancamentos';
import { useFechamentos, useFechamentosMutations } from '@/features/funcionarios/hooks/useFechamentos';
import { diasDoCiclo, offsetCicloAtual, parseISODate, toISODate } from '@/features/funcionarios/utils';

export default function Funcionarios() {
  const { canEdit, isAdmin, empresaId } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date();
  const hojeISO = toISODate(hoje);

  const { data: ancora, isLoading: ancoraLoading } = useQuery({
    queryKey: ['funcionarios', 'config-ciclo', empresaId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('configuracoes_empresa')
        .select('ponto_ciclo_ancora')
        .eq('empresa_id', empresaId as string)
        .maybeSingle();
      if (error) throw error;
      return (data?.ponto_ciclo_ancora as string | null) ?? null;
    },
    enabled: !!empresaId,
  });

  const salvarAncora = useMutation({
    mutationFn: async (ancoraISO: string) => {
      const { error } = await supabase
        .from('configuracoes_empresa')
        .update({ ponto_ciclo_ancora: ancoraISO })
        .eq('empresa_id', empresaId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ciclo de pagamento atualizado');
      qc.invalidateQueries({ queryKey: ['funcionarios', 'config-ciclo'] });
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e instanceof Error ? e.message : 'desconhecido'}`),
  });

  const [cicloOffset, setCicloOffset] = useState(0);
  const [ancoraIniciada, setAncoraIniciada] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupDraft, setSetupDraft] = useState(hojeISO);

  useEffect(() => {
    if (ancora && !ancoraIniciada) {
      setCicloOffset(offsetCicloAtual(ancora, hojeISO));
      setAncoraIniciada(true);
    }
  }, [ancora, ancoraIniciada, hojeISO]);

  const dias = useMemo(
    () => (ancora ? diasDoCiclo(ancora, cicloOffset) : []),
    [ancora, cicloOffset],
  );
  const periodoInicio = dias[0] ?? hojeISO;
  const periodoFim = dias[dias.length - 1] ?? hojeISO;

  // Compatibilidade com componentes que ainda recebem ano/mes/quinzena.
  const inicioDate = parseISODate(periodoInicio);
  const ano = inicioDate.getFullYear();
  const mes = inicioDate.getMonth();
  const quinzena: 1 | 2 = inicioDate.getDate() <= 15 ? 1 : 2;
  const irParaData = (a: number, m: number, q: 1 | 2) => {
    if (!ancora) return;
    setCicloOffset(offsetCicloAtual(ancora, toISODate(new Date(a, m, q === 1 ? 1 : 16))));
  };

  const [filtroFuncionario, setFiltroFuncionario] = useState<string | null>(null);
  const [lancInicio, setLancInicio] = useState(periodoInicio);
  const [lancFim, setLancFim] = useState(periodoFim);


  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Funcionários</h1>
        <p className="text-muted-foreground mt-1">Cadastro, controle de presença e lançamentos da equipe</p>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="ponto">Ponto</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="fechamentos">Fechamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="mt-4">
          <CadastroTab
            funcionarios={funcionarios}
            obras={obras}
            isLoading={isLoading}
            canEdit={canEdit}
            saving={funcMutations.salvar.isPending}
            onSave={(editId, values) => funcMutations.salvar.mutate({ editId, values })}
            onToggleAtivo={(id, ativo) => funcMutations.alternarAtivo.mutate({ id, ativo })}
            onDelete={(id) => funcMutations.excluir.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="ponto" className="mt-4">
          <PontoTab
            funcionarios={funcionarios}
            obras={obras}
            registros={registros}
            dias={dias}
            ano={ano}
            mes={mes}
            quinzena={quinzena}
            isLoading={isLoading || pontoLoading}
            canEdit={canEdit}
            saving={salvarPonto.isPending}
            onChangePeriodo={(a, m, q) => { setAno(a); setMes(m); setQuinzena(q); }}
            onSalvar={(funcionarioId, data, registroId, payload) =>
              salvarPonto.mutate({
                funcionarioId,
                data,
                registroId,
                status: payload.status,
                motivo: payload.motivo,
                obraId: payload.obraId,
                obraTexto: payload.obraTexto,
                observacao: payload.observacao,
                atualizarObraAtual: true,
              })
            }
            onLimpar={(id) => limparPonto.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="lancamentos" className="mt-4">
          <LancamentosTab
            funcionarios={funcionarios}
            lancamentos={lancamentos}
            isLoading={lancLoading}
            canEdit={canEdit}
            saving={lancMutations.salvar.isPending}
            filtroFuncionario={filtroFuncionario}
            inicio={lancInicio}
            fim={lancFim}
            onChangeFiltro={setFiltroFuncionario}
            onChangePeriodo={(i, f) => { setLancInicio(i); setLancFim(f); }}
            onSave={(values) => lancMutations.salvar.mutate({ editId: null, values })}
            onDelete={(id) => lancMutations.excluir.mutate(id)}
          />
        </TabsContent>
        <TabsContent value="fechamentos" className="mt-4">
          <FechamentosTab
            funcionarios={funcionarios}
            obras={obras}
            registros={registros}
            lancamentos={lancFechamento}
            dias={dias}
            ano={ano}
            mes={mes}
            quinzena={quinzena}
            fechamentos={fechamentos}
            isLoading={fechLoading}
            canEdit={canEdit}
            isAdmin={isAdmin}
            saving={fechMutations.fechar.isPending}
            funcionarioId={fechFuncionario}
            onChangeFuncionario={setFechFuncionario}
            onChangePeriodo={(a, m, q) => { setAno(a); setMes(m); setQuinzena(q); }}
            onFechar={(input) => fechMutations.fechar.mutate(input)}
            onReabrir={(id) => fechMutations.reabrir.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
