import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObrasFiltered } from '@/hooks/useObrasFiltered';
import { queryKeys } from '@/lib/queryKeys';

export interface ObraResumo {
  id: string;
  nome: string;
  endereco: string | null;
  status: string;
  cliente_nome: string | null;
  data_inicio: string | null;
  data_fim_prevista: string | null;
  total_receitas: number;
  total_despesas: number;
  total_recebido: number;
}

export interface FerramentaItem {
  id: string;
  nome: string;
  numero_cadastro: string;
  status: string;
  tipo: string;
  obra_id: string | null;
  obra_nome: string | null;
}

export interface ParcelaItem {
  id: string;
  valor: number;
  status: string;
  data_vencimento: string;
  data_recebimento: string | null;
  obra_nome?: string | null;
}

export interface DespesaItem {
  id?: string;
  valor: number;
  tipo: string;
  data: string;
  data_vencimento?: string | null;
  obra_id: string;
}

export interface DiarioItem {
  id: string;
  data: string;
  obra_id: string;
  obra_nome?: string;
}

export interface AtividadeItem {
  id: string;
  nome: string;
  data_fim: string | null;
  status: string;
  percentual: number;
  obra_id: string;
}

interface DashboardQueryData {
  obras: ObraResumo[];
  despesas: DespesaItem[];
  parcelas: ParcelaItem[];
  ferramentas: FerramentaItem[];
  diarios: DiarioItem[];
  atividades: AtividadeItem[];
  despesasPorTipo: { name: string; value: number }[];
  evolucaoMensal: { mes: string; Receitas: number; Despesas: number }[];
  parcelasAtrasadas: number;
}

const EMPTY_DATA: DashboardQueryData = {
  obras: [],
  despesas: [],
  parcelas: [],
  ferramentas: [],
  diarios: [],
  atividades: [],
  despesasPorTipo: [],
  evolucaoMensal: [],
  parcelasAtrasadas: 0,
};

export interface DashboardData {
  loading: boolean;
  obras: ObraResumo[];
  despesas: DespesaItem[];
  parcelas: ParcelaItem[];
  ferramentas: FerramentaItem[];
  diarios: DiarioItem[];
  atividades: AtividadeItem[];
  totals: {
    totalContratos: number;
    totalRecebido: number;
    totalGastos: number;
    parcelasAtrasadas: number;
  };
  despesasPorTipo: { name: string; value: number }[];
  evolucaoMensal: { mes: string; Receitas: number; Despesas: number }[];
  refresh: () => void;
}

export function useDashboardData(): DashboardData {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const { filterObras, loading: obrasFilterLoading } = useObrasFiltered();

  const dashboardKey = queryKeys.dashboard(user?.id ?? '', role);

  const { data, isLoading } = useQuery({
    queryKey: dashboardKey,
    enabled: !!user && !obrasFilterLoading,
    staleTime: 0, // exibe o cache na hora e atualiza em segundo plano ao montar
    queryFn: async (): Promise<DashboardQueryData> => {
      const { data: obrasData } = await supabase
        .from('obras')
        .select('id, nome, endereco, status, data_inicio, data_fim_prevista, clientes(nome)')
        .order('created_at', { ascending: false });

      if (!obrasData) return EMPTY_DATA;
      const filtered = filterObras(obrasData as any[]);
      const obraIds = filtered.map((o: any) => o.id);

      if (obraIds.length === 0) return EMPTY_DATA;

      const [recRes, despRes, ferRes, diaRes, atvRes] = await Promise.all([
        supabase.from('receitas').select('id, valor_total, obra_id').in('obra_id', obraIds),
        supabase.from('despesas').select('id, valor, obra_id, tipo, data, data_vencimento').in('obra_id', obraIds),
        supabase.from('ferramentas').select('id, nome, numero_cadastro, status, tipo, obra_id'),
        supabase.from('diario_obra').select('id, data, obra_id').in('obra_id', obraIds).order('data', { ascending: false }).limit(20),
        supabase.from('cronograma_atividades').select('id, nome_atividade, data_fim, status, percentual_concluido, cronograma_id, cronograma!inner(obra_id)').limit(200),
      ]);

      const allReceitas = recRes.data || [];
      const allDespesas = (despRes.data || []) as any[];
      const receitaIds = allReceitas.map(r => r.id);
      let allParcelas: any[] = [];
      if (receitaIds.length > 0) {
        const { data } = await supabase
          .from('parcelas')
          .select('id, valor, status, receita_id, data_vencimento, data_recebimento')
          .in('receita_id', receitaIds);
        allParcelas = data || [];
      }

      const today = new Date().toISOString().split('T')[0];
      const late = allParcelas.filter(p => !p.data_recebimento && p.data_vencimento < today).length;

      const obrasResumo: ObraResumo[] = filtered.map((o: any) => {
        const oRec = allReceitas.filter(r => r.obra_id === o.id);
        const oRecIds = oRec.map(r => r.id);
        const oDesp = allDespesas.filter(d => d.obra_id === o.id);
        const oParc = allParcelas.filter(p => oRecIds.includes(p.receita_id));
        return {
          id: o.id,
          nome: o.nome,
          endereco: o.endereco,
          status: o.status,
          cliente_nome: o.clientes?.nome || null,
          data_inicio: o.data_inicio,
          data_fim_prevista: o.data_fim_prevista,
          total_receitas: oRec.reduce((s, r) => s + Number(r.valor_total), 0),
          total_despesas: oDesp.reduce((s, d) => s + Number(d.valor), 0),
          total_recebido: oParc.filter(p => p.data_recebimento).reduce((s, p) => s + Number(p.valor), 0),
        };
      });

      // despesas por tipo
      const tipoLabels: Record<string, string> = { material: 'Material', mao_obra: 'Mão de Obra', ferramenta: 'Ferramenta', manutencao: 'Manutenção', outros: 'Outros' };
      const tipoMap: Record<string, number> = {};
      allDespesas.forEach(d => {
        const label = tipoLabels[d.tipo] || d.tipo;
        tipoMap[label] = (tipoMap[label] || 0) + Number(d.valor);
      });

      // evolução mensal
      const mesesMap: Record<string, { receitas: number; despesas: number }> = {};
      allDespesas.forEach(d => {
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

      // ferramentas com nome da obra
      const fers: FerramentaItem[] = (ferRes.data || []).map((f: any) => {
        const obra = filtered.find((o: any) => o.id === f.obra_id);
        return {
          id: f.id, nome: f.nome, numero_cadastro: f.numero_cadastro,
          status: f.status, tipo: f.tipo, obra_id: f.obra_id,
          obra_nome: obra ? (obra as any).nome : (f.obra_id ? 'Obra desconhecida' : null),
        };
      });

      // diários
      const dias: DiarioItem[] = (diaRes.data || []).map((d: any) => {
        const obra = filtered.find((o: any) => o.id === d.obra_id);
        return { id: d.id, data: d.data, obra_id: d.obra_id, obra_nome: obra ? (obra as any).nome : '' };
      });

      // atividades
      const atvs: AtividadeItem[] = (atvRes.data || []).map((a: any) => ({
        id: a.id,
        nome: a.nome_atividade,
        data_fim: a.data_fim,
        status: a.status,
        percentual: a.percentual_concluido,
        obra_id: a.cronograma?.obra_id,
      })).filter(a => obraIds.includes(a.obra_id));

      const parc: ParcelaItem[] = allParcelas.map(p => ({
        id: p.id, valor: Number(p.valor), status: p.status,
        data_vencimento: p.data_vencimento, data_recebimento: p.data_recebimento,
      }));

      const desp: DespesaItem[] = allDespesas.map(d => ({
        id: d.id, valor: Number(d.valor), tipo: d.tipo, data: d.data,
        data_vencimento: d.data_vencimento, obra_id: d.obra_id,
      }));

      return {
        obras: obrasResumo,
        despesas: desp,
        parcelas: parc,
        ferramentas: fers,
        diarios: dias,
        atividades: atvs,
        parcelasAtrasadas: late,
        despesasPorTipo: Object.entries(tipoMap).map(([name, value]) => ({ name, value })),
        evolucaoMensal: sortedMonths.map(([mes, v]) => ({
          mes: new Date(mes + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          Receitas: v.receitas,
          Despesas: v.despesas,
        })),
      };
    },
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: dashboardKey });
  }, [queryClient, dashboardKey]);

  const d = data ?? EMPTY_DATA;
  const totalContratos = d.obras.reduce((s, o) => s + o.total_receitas, 0);
  const totalRecebido = d.obras.reduce((s, o) => s + o.total_recebido, 0);
  const totalGastos = d.obras.reduce((s, o) => s + o.total_despesas, 0);

  return {
    loading: obrasFilterLoading || isLoading,
    obras: d.obras,
    despesas: d.despesas,
    parcelas: d.parcelas,
    ferramentas: d.ferramentas,
    diarios: d.diarios,
    atividades: d.atividades,
    totals: { totalContratos, totalRecebido, totalGastos, parcelasAtrasadas: d.parcelasAtrasadas },
    despesasPorTipo: d.despesasPorTipo,
    evolucaoMensal: d.evolucaoMensal,
    refresh,
  };
}
