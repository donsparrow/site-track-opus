import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AnexoPreviewDialog, { AnexoPreviewTarget } from '@/components/AnexoPreviewDialog';

import { useObrasFinanceiro } from '@/features/financeiro/hooks/useObrasFinanceiro';
import { useReceitas } from '@/features/financeiro/hooks/useReceitas';
import { useDespesas } from '@/features/financeiro/hooks/useDespesas';
import { useParcelasRecebidas } from '@/features/financeiro/hooks/useParcelas';
import { useAnexosFinanceiro } from '@/features/financeiro/hooks/useAnexosFinanceiro';
import { useFinanceiroMutations } from '@/features/financeiro/hooks/useFinanceiroMutations';
import { calcSaldo, somaDespesas, somaReceitas } from '@/features/financeiro/utils';
import { gerarRelatorioNotas } from '@/features/financeiro/relatorioNotas';
import { downloadAnexo } from '@/features/financeiro/anexoDownload';

import ResumoFinanceiro from '@/features/financeiro/components/ResumoFinanceiro';
import FiltrosFinanceiro from '@/features/financeiro/components/FiltrosFinanceiro';
import ErroCarregamento from '@/features/financeiro/components/ErroCarregamento';
import TabelaSkeleton from '@/features/financeiro/components/TabelaSkeleton';
import TabelaReceitas from '@/features/financeiro/components/TabelaReceitas';
import TabelaDespesas from '@/features/financeiro/components/TabelaDespesas';
import NotasFiscaisTab from '@/features/financeiro/components/NotasFiscaisTab';
import ExtratoFinanceiro from '@/features/financeiro/components/ExtratoFinanceiro';
import NovaReceitaDialog from '@/features/financeiro/components/NovaReceitaDialog';
import NovaDespesaDialog from '@/features/financeiro/components/NovaDespesaDialog';
import AnexoUploadDialog from '@/features/financeiro/components/AnexoUploadDialog';
import EditarReceitaDialog from '@/features/financeiro/components/EditarReceitaDialog';
import EditarParcelaDialog from '@/features/financeiro/components/EditarParcelaDialog';
import EditarDespesaDialog from '@/features/financeiro/components/EditarDespesaDialog';
import ReceberParcelaDialog from '@/features/financeiro/components/ReceberParcelaDialog';
import ConfirmarExclusaoDialog from '@/features/financeiro/components/ConfirmarExclusaoDialog';
import type { DespesaComObra, Parcela, ReceitaComObra, TipoRegistroAnexo } from '@/features/financeiro/types';

export default function Financeiro() {
  const { canEdit, role } = useAuth();
  const isAdmin = role === 'admin';

  const [filterObra, setFilterObra] = useState('all');
  const [expandedReceita, setExpandedReceita] = useState<string | null>(null);
  const [previewAnexo, setPreviewAnexo] = useState<AnexoPreviewTarget | null>(null);

  const [receitaOpen, setReceitaOpen] = useState(false);
  const [despesaOpen, setDespesaOpen] = useState(false);
  const [anexoAlvo, setAnexoAlvo] = useState<{ id: string; tipo: TipoRegistroAnexo } | null>(null);
  const [editReceita, setEditReceita] = useState<ReceitaComObra | null>(null);
  const [editParcela, setEditParcela] = useState<Parcela | null>(null);
  const [editDespesa, setEditDespesa] = useState<DespesaComObra | null>(null);
  const [receberAlvo, setReceberAlvo] = useState<Parcela | null>(null);
  const [excluirReceitaId, setExcluirReceitaId] = useState<string | null>(null);
  const [excluirDespesaId, setExcluirDespesaId] = useState<string | null>(null);
  const [excluirParcelaAlvo, setExcluirParcelaAlvo] = useState<Parcela | null>(null);

  const { obras, isSuccess: obrasReady, isLoading: obrasLoading } = useObrasFinanceiro();
  const scope = { filterObra, obras, obrasReady };
  const receitasQuery = useReceitas(scope);
  const despesasQuery = useDespesas(scope);
  const recebidasQuery = useParcelasRecebidas(scope);
  const { anexos } = useAnexosFinanceiro();
  const m = useFinanceiroMutations();

  const { receitas } = receitasQuery;
  const { despesas } = despesasQuery;

  const totalReceitas = somaReceitas(receitas);
  const totalDespesas = somaDespesas(despesas);
  const carregando = obrasLoading || receitasQuery.isPending || despesasQuery.isPending;
  const erro = receitasQuery.isError || despesasQuery.isError;

  const recarregar = () => { receitasQuery.refetch(); despesasQuery.refetch(); recebidasQuery.refetch(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">Financeiro</h1>
        <Button variant="outline" size="sm" onClick={() => gerarRelatorioNotas(anexos, receitas, despesas)}>
          <FileText className="h-4 w-4 mr-1" /> Relatório Notas Fiscais
        </Button>
      </div>

      <ResumoFinanceiro
        totalReceitas={totalReceitas}
        totalDespesas={totalDespesas}
        saldo={calcSaldo(totalReceitas, totalDespesas)}
        loading={carregando}
      />

      <FiltrosFinanceiro obras={obras} value={filterObra} onChange={setFilterObra} />

      {erro ? (
        <ErroCarregamento onRetry={recarregar} />
      ) : (
        <Tabs defaultValue="extrato">
          <TabsList className="mb-6">
            <TabsTrigger value="extrato"><BarChart3 className="h-4 w-4 mr-1" />Extrato</TabsTrigger>
            <TabsTrigger value="receitas">Receitas ({receitas.length})</TabsTrigger>
            <TabsTrigger value="despesas">Despesas ({despesas.length})</TabsTrigger>
            <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
          </TabsList>

          <TabsContent value="extrato">
            {carregando ? (
              <TabelaSkeleton />
            ) : (
              <ExtratoFinanceiro
                parcelasRecebidas={recebidasQuery.parcelasRecebidas}
                despesas={despesas.map((d) => ({
                  id: d.id,
                  valor: Number(d.valor),
                  data: d.data,
                  descricao: d.descricao,
                  obra_nome: d.obras?.nome || '—',
                }))}
              />
            )}
          </TabsContent>

          <TabsContent value="receitas">
            {carregando ? (
              <TabelaSkeleton />
            ) : (
              <TabelaReceitas
                receitas={receitas}
                anexos={anexos}
                canEdit={canEdit}
                isAdmin={isAdmin}
                expandedReceita={expandedReceita}
                onToggleReceita={(id) => setExpandedReceita((prev) => (prev === id ? null : id))}
                onNovaReceita={() => setReceitaOpen(true)}
                onEditarReceita={setEditReceita}
                onExcluirReceita={setExcluirReceitaId}
                onEditarParcela={setEditParcela}
                onExcluirParcela={setExcluirParcelaAlvo}
                onReceberParcela={setReceberAlvo}
                onAnexar={(id) => setAnexoAlvo({ id, tipo: 'receita' })}
                onPreviewAnexo={setPreviewAnexo}
              />
            )}
          </TabsContent>

          <TabsContent value="despesas">
            {carregando ? (
              <TabelaSkeleton />
            ) : (
              <TabelaDespesas
                despesas={despesas}
                anexos={anexos}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onNovaDespesa={() => setDespesaOpen(true)}
                onEditarDespesa={setEditDespesa}
                onExcluirDespesa={setExcluirDespesaId}
                onAnexar={(id) => setAnexoAlvo({ id, tipo: 'despesa' })}
                onPreviewAnexo={setPreviewAnexo}
              />
            )}
          </TabsContent>

          <TabsContent value="notas">
            <NotasFiscaisTab
              anexos={anexos}
              receitas={receitas}
              despesas={despesas}
              onExportar={() => gerarRelatorioNotas(anexos, receitas, despesas)}
              onPreviewAnexo={setPreviewAnexo}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* ===== DIALOGS ===== */}
      <AnexoPreviewDialog
        anexo={previewAnexo}
        onOpenChange={(o) => { if (!o) setPreviewAnexo(null); }}
        onDownload={downloadAnexo}
      />

      <NovaReceitaDialog open={receitaOpen} onOpenChange={setReceitaOpen} />
      <NovaDespesaDialog open={despesaOpen} onOpenChange={setDespesaOpen} />

      <AnexoUploadDialog
        open={!!anexoAlvo}
        onOpenChange={(o) => { if (!o) setAnexoAlvo(null); }}
        registroId={anexoAlvo?.id ?? null}
        tipoRegistro={anexoAlvo?.tipo ?? 'receita'}
        uploading={m.uploadAnexos.isPending}
        onUpload={(tipoAnexo, files) => {
          if (!anexoAlvo) return;
          m.uploadAnexos.mutate(
            { registroId: anexoAlvo.id, tipoRegistro: anexoAlvo.tipo, tipoAnexo, files },
            { onSuccess: () => setAnexoAlvo(null) },
          );
        }}
      />

      <EditarReceitaDialog
        receita={editReceita}
        open={!!editReceita}
        onOpenChange={(o) => { if (!o) setEditReceita(null); }}
        onSubmit={(values) => {
          if (!editReceita) return;
          m.editarReceita.mutate({ id: editReceita.id, ...values }, { onSuccess: () => setEditReceita(null) });
        }}
      />

      <EditarParcelaDialog
        parcela={editParcela}
        open={!!editParcela}
        onOpenChange={(o) => { if (!o) setEditParcela(null); }}
        onSubmit={(values) => {
          if (!editParcela) return;
          m.editarParcela.mutate(
            { id: editParcela.id, receita_id: editParcela.receita_id, ...values },
            { onSuccess: () => setEditParcela(null) },
          );
        }}
      />

      <EditarDespesaDialog
        despesa={editDespesa}
        open={!!editDespesa}
        onOpenChange={(o) => { if (!o) setEditDespesa(null); }}
        onSubmit={(values) => {
          if (!editDespesa) return;
          m.editarDespesa.mutate({ original: editDespesa, ...values }, { onSuccess: () => setEditDespesa(null) });
        }}
      />

      <ReceberParcelaDialog
        open={!!receberAlvo}
        onOpenChange={(o) => { if (!o) setReceberAlvo(null); }}
        onConfirm={(formaPagamento) => {
          if (!receberAlvo) return;
          m.receberParcela.mutate({
            parcelaId: receberAlvo.id,
            receitaId: receberAlvo.receita_id,
            formaPagamento,
          });
          setReceberAlvo(null);
        }}
      />

      <ConfirmarExclusaoDialog
        open={!!excluirReceitaId}
        onOpenChange={(o) => { if (!o) setExcluirReceitaId(null); }}
        titulo="Excluir Receita"
        descricao="Tem certeza que deseja excluir esta receita e todas as parcelas vinculadas?"
        onConfirm={() => {
          if (excluirReceitaId) m.excluirReceita.mutate(excluirReceitaId);
          setExcluirReceitaId(null);
        }}
      />

      <ConfirmarExclusaoDialog
        open={!!excluirDespesaId}
        onOpenChange={(o) => { if (!o) setExcluirDespesaId(null); }}
        titulo="Excluir Despesa"
        descricao="Tem certeza que deseja excluir esta despesa?"
        onConfirm={() => {
          if (excluirDespesaId) m.excluirDespesa.mutate(excluirDespesaId);
          setExcluirDespesaId(null);
        }}
      />

      <ConfirmarExclusaoDialog
        open={!!excluirParcelaAlvo}
        onOpenChange={(o) => { if (!o) setExcluirParcelaAlvo(null); }}
        titulo="Excluir Parcela"
        descricao={
          excluirParcelaAlvo?.data_recebimento
            ? 'Esta parcela já foi marcada como recebida. Tem certeza que deseja excluí-la?'
            : 'Tem certeza que deseja excluir esta parcela?'
        }
        onConfirm={() => {
          if (excluirParcelaAlvo) {
            m.excluirParcela.mutate({ id: excluirParcelaAlvo.id, receitaId: excluirParcelaAlvo.receita_id });
          }
          setExcluirParcelaAlvo(null);
        }}
      />
    </div>
  );
}
