import AgendaDoDiaWidget from '@/components/AgendaDoDiaWidget';
import {
  KpiContratosWidget, KpiRecebidoWidget, KpiGastosWidget, KpiParcelasAtrasadasWidget,
  ObrasAndamentoWidget, ObrasConcluidasWidget, ObrasAtrasadasWidget, EvolucaoFisicaWidget,
  ContasReceberWidget, ContasPagarWidget,
} from './widgets/KpiWidgets';
import { DespesasPorTipoWidget, EvolucaoMensalWidget } from './widgets/ChartWidgets';
import {
  FerramentasResumoWidget, UltimosDiariosWidget,
  AtividadesPendentesWidget, AtividadesAtrasoWidget,
} from './widgets/ListWidgets';
import RequerAtencaoWidget from './widgets/RequerAtencaoWidget';
import MinhasObrasWidget from './widgets/MinhasObrasWidget';
import type { WidgetSize, WidgetConfig } from '@/types/dashboard';
import type { ComponentType } from 'react';

export type WidgetCategory = 'obras' | 'financeiro' | 'ferramentas' | 'agenda' | 'cronograma' | 'diario';

export interface WidgetDefinition {
  type: string;
  label: string;
  description: string;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  Component: ComponentType<{ config?: WidgetConfig }>;
  supportsObraFilter?: boolean;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // FINANCEIRO
  'kpi-contratos': { type: 'kpi-contratos', label: 'Total Contratos', description: 'Soma do valor de todos os contratos', category: 'financeiro', defaultSize: 'small', Component: KpiContratosWidget },
  'kpi-recebido': { type: 'kpi-recebido', label: 'Total Recebido', description: 'Valor total já recebido', category: 'financeiro', defaultSize: 'small', Component: KpiRecebidoWidget },
  'kpi-gastos': { type: 'kpi-gastos', label: 'Total Gastos', description: 'Soma de todas as despesas', category: 'financeiro', defaultSize: 'small', Component: KpiGastosWidget },
  'kpi-parcelas-atrasadas': { type: 'kpi-parcelas-atrasadas', label: 'Parcelas Atrasadas', description: 'Quantidade de parcelas vencidas', category: 'financeiro', defaultSize: 'small', Component: KpiParcelasAtrasadasWidget },
  'despesas-tipo': { type: 'despesas-tipo', label: 'Despesas por Tipo', description: 'Gráfico de pizza das despesas', category: 'financeiro', defaultSize: 'medium', Component: DespesasPorTipoWidget },
  'evolucao-mensal': { type: 'evolucao-mensal', label: 'Evolução Mensal', description: 'Receitas vs despesas por mês', category: 'financeiro', defaultSize: 'medium', Component: EvolucaoMensalWidget },
  'contas-receber': { type: 'contas-receber', label: 'Contas a Receber', description: 'Total pendente de recebimento', category: 'financeiro', defaultSize: 'small', Component: ContasReceberWidget },
  'contas-pagar': { type: 'contas-pagar', label: 'Contas a Pagar', description: 'Total de despesas a vencer', category: 'financeiro', defaultSize: 'small', Component: ContasPagarWidget },

  // OBRAS
  'obras-andamento': { type: 'obras-andamento', label: 'Obras em Andamento', description: 'Contagem de obras ativas', category: 'obras', defaultSize: 'small', Component: ObrasAndamentoWidget },
  'obras-concluidas': { type: 'obras-concluidas', label: 'Obras Concluídas', description: 'Contagem de obras finalizadas', category: 'obras', defaultSize: 'small', Component: ObrasConcluidasWidget },
  'obras-atrasadas': { type: 'obras-atrasadas', label: 'Obras Atrasadas', description: 'Obras com prazo vencido', category: 'obras', defaultSize: 'small', Component: ObrasAtrasadasWidget },
  'evolucao-fisica': { type: 'evolucao-fisica', label: 'Evolução Física Média', description: '% médio de progresso', category: 'obras', defaultSize: 'small', Component: EvolucaoFisicaWidget },

  'requer-atencao': { type: 'requer-atencao', label: 'Requer Atenção', description: 'Pendências que exigem ação (atrasos, vencimentos, diários)', category: 'obras', defaultSize: 'medium', Component: RequerAtencaoWidget },
  'minhas-obras': { type: 'minhas-obras', label: 'Minhas Obras', description: 'Cartões de obras com progresso físico e financeiro', category: 'obras', defaultSize: 'full', Component: MinhasObrasWidget },

  // FERRAMENTAS
  'ferramentas-resumo': { type: 'ferramentas-resumo', label: 'Resumo de Ferramentas', description: 'Status e lista de ferramentas', category: 'ferramentas', defaultSize: 'full', Component: FerramentasResumoWidget, supportsObraFilter: true },

  // AGENDA
  'agenda-dia': { type: 'agenda-dia', label: 'Agenda do Dia', description: 'Eventos do Google Calendar', category: 'agenda', defaultSize: 'full', Component: AgendaDoDiaWidget as any },

  // CRONOGRAMA
  'atividades-pendentes': { type: 'atividades-pendentes', label: 'Atividades Pendentes', description: 'Atividades em aberto', category: 'cronograma', defaultSize: 'medium', Component: AtividadesPendentesWidget, supportsObraFilter: true },
  'atividades-atraso': { type: 'atividades-atraso', label: 'Atividades em Atraso', description: 'Atividades com prazo vencido', category: 'cronograma', defaultSize: 'medium', Component: AtividadesAtrasoWidget, supportsObraFilter: true },

  // DIÁRIO
  'ultimos-diarios': { type: 'ultimos-diarios', label: 'Últimos Diários', description: 'Registros recentes de diário', category: 'diario', defaultSize: 'medium', Component: UltimosDiariosWidget, supportsObraFilter: true },
};

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  obras: 'Obras',
  financeiro: 'Financeiro',
  ferramentas: 'Ferramentas',
  agenda: 'Agenda',
  cronograma: 'Cronograma',
  diario: 'Diário de Obra',
};
