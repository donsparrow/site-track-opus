import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CadastroTab from '@/features/funcionarios/components/CadastroTab';
import PontoTab from '@/features/funcionarios/components/PontoTab';
import LancamentosTab from '@/features/funcionarios/components/LancamentosTab';
import { useFuncionarios, useFuncionariosMutations, useObrasFuncionarios } from '@/features/funcionarios/hooks/useFuncionarios';
import { usePonto, usePontoMutations } from '@/features/funcionarios/hooks/usePonto';
import { useLancamentos, useLancamentosMutations } from '@/features/funcionarios/hooks/useLancamentos';
import { diasDaQuinzena } from '@/features/funcionarios/utils';

export default function Funcionarios() {
  const { canEdit } = useAuth();
  const hoje = new Date();

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [quinzena, setQuinzena] = useState<1 | 2>(hoje.getDate() <= 15 ? 1 : 2);

  const dias = useMemo(() => diasDaQuinzena(ano, mes, quinzena), [ano, mes, quinzena]);
  const periodoInicio = dias[0];
  const periodoFim = dias[dias.length - 1];

  const [filtroFuncionario, setFiltroFuncionario] = useState<string | null>(null);
  const [lancInicio, setLancInicio] = useState(periodoInicio);
  const [lancFim, setLancFim] = useState(periodoFim);

  const { funcionarios, isLoading } = useFuncionarios();
  const { obras } = useObrasFuncionarios();
  const funcMutations = useFuncionariosMutations();

  const { registros, isLoading: pontoLoading } = usePonto(periodoInicio, periodoFim);
  const { salvarPonto, limparPonto } = usePontoMutations(periodoInicio, periodoFim);

  const { lancamentos, isLoading: lancLoading } = useLancamentos(filtroFuncionario, lancInicio, lancFim);
  const lancMutations = useLancamentosMutations();

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
      </Tabs>
    </div>
  );
}
