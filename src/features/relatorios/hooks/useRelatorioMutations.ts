import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { carregarDadosRelatorio } from '@/lib/relatorioDados';
import type { Json } from '@/integrations/supabase/types';
import { relatoriosPrefixes } from '../queryKeys';
import { gerarPDFRelatorio } from '../pdf';
import { aplicarIndicadoresCongelados, calcularIndicadores } from '../indicadores';
import { buildSnapshot, detectChanges, revLabel } from '../utils';
import type {
  Assinatura, DadosRelatorio, EmpresaConfig, ObraRelatorio, Relatorio,
  RelatorioComObra, RelatorioVersao, SnapshotDados,
} from '../types';
import { useRelatoriosScope } from './useObrasRelatorios';

/* ---------- leituras auxiliares usadas apenas dentro das mutations ---------- */

async function fetchVersoes(relatorioId: string): Promise<RelatorioVersao[]> {
  const { data } = await supabase
    .from('relatorio_versoes')
    .select('*')
    .eq('relatorio_id', relatorioId)
    .order('numero_versao', { ascending: false });
  return (data || []) as RelatorioVersao[];
}

async function isPrimeiroPdfDoUsuario(relId: string, userId: string) {
  const { data } = await supabase
    .from('relatorio_logs')
    .select('id, acao')
    .eq('relatorio_id', relId)
    .eq('usuario_id', userId)
    .ilike('acao', '%PDF%')
    .limit(1);
  return !(data && data.length > 0);
}

async function getNomeUsuario(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.nome || data?.email || 'Usuário';
}

/* ------------------------------- inputs ---------------------------------- */

interface ConsolidarInput {
  obraId: string;
  inicio: string;
  fim: string;
  dados: DadosRelatorio;
}

interface SalvarInput {
  relatorioId: string;
  periodo: { inicio: string; fim: string };
  dados: DadosRelatorio;
}

interface GerarPdfInput {
  relatorioId: string | null;
  empresa: EmpresaConfig | null;
  obra: ObraRelatorio;
  periodo: { inicio: string; fim: string };
  dados: DadosRelatorio;
  revisaoPdf: number;
}

interface AssinarInput {
  relatorioId: string;
  dataUrl: string;
  nome: string;
  cargo: string;
  tipo: string;
}

interface DownloadListaInput {
  relatorio: RelatorioComObra;
  empresa: EmpresaConfig | null;
}

export function useRelatorioMutations() {
  const qc = useQueryClient();
  const { user } = useRelatoriosScope();

  const invalidateLista = () => qc.invalidateQueries({ queryKey: relatoriosPrefixes.lista });
  const invalidateRelatorio = (relatorioId: string | null) => {
    qc.invalidateQueries({ queryKey: relatoriosPrefixes.detalhe });
    qc.invalidateQueries({ queryKey: relatoriosPrefixes.dados });
    qc.invalidateQueries({ queryKey: relatoriosPrefixes.assinaturas });
    qc.invalidateQueries({ queryKey: relatoriosPrefixes.versoes });
    qc.invalidateQueries({ queryKey: relatoriosPrefixes.logs });
    invalidateLista();
    return relatorioId;
  };

  /** Cria (ou atualiza) o relatório do período e vincula os diários. */
  const consolidar = useMutation({
    mutationFn: async ({ obraId, inicio, fim, dados }: ConsolidarInput) => {
      const { contratual, parados, trabalhados, ajustado, saldo } = dados.prazos;

      let { data: relatorio } = await supabase
        .from('relatorios')
        .select('id, status, prazo_contratual_dias_uteis, revisao_pdf')
        .eq('obra_id', obraId)
        .gte('data_inicio', inicio)
        .lte('data_fim', fim)
        .single();

      let revisao = 0;

      if (!relatorio) {
        const { data: newRel, error } = await supabase
          .from('relatorios')
          .insert({
            obra_id: obraId,
            data_inicio: inicio,
            data_fim: fim,
            prazo_contratual_dias_uteis: contratual,
            dias_parados: parados,
            dias_trabalhados: trabalhados,
            prazo_ajustado: ajustado,
            saldo_prazo: saldo,
            status: 'rascunho',
          })
          .select('id, status, prazo_contratual_dias_uteis, revisao_pdf')
          .single();
        if (error) throw error;
        relatorio = newRel;

        if (relatorio && user) {
          await supabase.from('relatorio_versoes').insert({
            relatorio_id: relatorio.id,
            numero_versao: 1,
            criado_por: user.id,
            status: 'rascunho',
            descricao_alteracao: 'Criação do relatório',
            snapshot_dados: {
              prazos: { contratual, parados, ajustado, trabalhados, saldo },
              periodo: { inicio, fim },
              diarios_count: 0, equipe_count: 0, atividades_count: 0,
              materiais_count: 0, ocorrencias_count: 0, imagens_count: 0,
            },
          });
          await supabase.from('relatorio_logs').insert({
            relatorio_id: relatorio.id,
            usuario_id: user.id,
            acao: 'criou',
          });
        }
      } else {
        revisao = relatorio.revisao_pdf || 0;
        await supabase.from('relatorios').update({
          prazo_contratual_dias_uteis: contratual,
          dias_parados: parados,
          dias_trabalhados: trabalhados,
          prazo_ajustado: ajustado,
          saldo_prazo: saldo,
        }).eq('id', relatorio.id);
      }

      if (!relatorio) throw new Error('Não foi possível criar o relatório');

      const diarioIds = (dados.diarios as { id: string }[]).map((d) => d.id);
      if (diarioIds.length > 0) {
        await supabase.from('diario_obra').update({ relatorio_id: relatorio.id }).in('id', diarioIds);
      }

      return { relatorioId: relatorio.id as string, revisaoPdf: revisao };
    },
    onSuccess: (res) => {
      invalidateRelatorio(res.relatorioId);
      toast.success('Dados consolidados!');
    },
    onError: (e: Error) => toast.error('Erro ao consolidar: ' + e.message),
  });

  /** Salva o relatório, registrando nova versão apenas quando o conteúdo mudou. */
  const salvar = useMutation({
    mutationFn: async ({ relatorioId, periodo, dados }: SalvarInput) => {
      await supabase.from('relatorios').update({
        prazo_contratual_dias_uteis: dados.prazos.contratual,
        dias_parados: dados.prazos.parados,
        dias_trabalhados: dados.prazos.trabalhados,
        prazo_ajustado: dados.prazos.ajustado,
        saldo_prazo: dados.prazos.saldo,
        data_inicio: periodo.inicio,
        data_fim: periodo.fim,
      }).eq('id', relatorioId);

      const versoes = await fetchVersoes(relatorioId);
      const currentSnapshot = buildSnapshot(dados, periodo);
      const lastSnapshot = (versoes[0]?.snapshot_dados as unknown as SnapshotDados) || null;
      const { hasChanges, summary } = detectChanges(lastSnapshot, currentSnapshot);

      if (hasChanges && user) {
        const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorioId,
          numero_versao: nextVersion,
          criado_por: user.id,
          status: 'rascunho',
          descricao_alteracao: summary,
          snapshot_dados: currentSnapshot as unknown as Json,
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: 'salvou (com alterações)',
        });
      } else if (user) {
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: 'salvou (sem alterações)',
        });
      }

      return { hasChanges, relatorioId };
    },
    onSuccess: ({ hasChanges, relatorioId }) => {
      invalidateRelatorio(relatorioId);
      toast.success(hasChanges
        ? 'Relatório salvo — nova versão registrada!'
        : 'Relatório salvo (sem alterações no conteúdo).');
    },
    onError: (e: Error) => toast.error('Erro ao salvar: ' + e.message),
  });

  /** Gera o PDF a partir dos dados já carregados e registra revisão/histórico. */
  const gerarPdf = useMutation({
    mutationFn: async ({ relatorioId, empresa, obra, periodo, dados, revisaoPdf }: GerarPdfInput) => {
      const versoes = relatorioId ? await fetchVersoes(relatorioId) : [];
      const assinaturas: Assinatura[] = relatorioId
        ? ((await supabase.from('assinaturas').select('*').eq('relatorio_id', relatorioId).order('data_assinatura')).data || []) as Assinatura[]
        : [];

      const currentSnapshot = buildSnapshot(dados, periodo);
      const lastSnapshot = (versoes[0]?.snapshot_dados as unknown as SnapshotDados) || null;
      const { hasChanges, summary } = detectChanges(lastSnapshot, currentSnapshot);
      const label = revLabel(revisaoPdf);

      await gerarPDFRelatorio({ empresa, obra, periodo, dados, assinaturas, versoes, revisao: revisaoPdf });

      if (!relatorioId || !user) return { relatorioId, novaRevisao: revisaoPdf, mensagem: 'PDF gerado!' };

      const { data: relAtual } = await supabase.from('relatorios').select('status').eq('id', relatorioId).maybeSingle();
      const statusAtual = (relAtual as Relatorio | null)?.status || 'rascunho';

      const primeiraVez = await isPrimeiroPdfDoUsuario(relatorioId, user.id);
      const autorNome = await getNomeUsuario(user.id);
      const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;

      if (hasChanges) {
        const nextRevisao = revisaoPdf + 1;
        await supabase.from('relatorios').update({ revisao_pdf: nextRevisao }).eq('id', relatorioId);

        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorioId,
          numero_versao: nextVersion,
          criado_por: user.id,
          status: statusAtual,
          descricao_alteracao: primeiraVez ? `${summary} — PDF gerado por ${autorNome}` : summary,
          snapshot_dados: currentSnapshot as unknown as Json,
        });

        if (primeiraVez) {
          await supabase.from('relatorio_logs').insert({
            relatorio_id: relatorioId,
            usuario_id: user.id,
            acao: `gerou PDF ${label}`,
          });
        }

        return { relatorioId, novaRevisao: nextRevisao, mensagem: `PDF ${label} gerado — nova revisão criada!` };
      }

      const efetivaRevisao = revisaoPdf > 0 ? revisaoPdf : 1;
      await supabase.from('relatorios').update({ revisao_pdf: efetivaRevisao }).eq('id', relatorioId);

      if (primeiraVez) {
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorioId,
          numero_versao: nextVersion,
          criado_por: user.id,
          status: statusAtual,
          descricao_alteracao: `PDF gerado por ${autorNome}`,
          snapshot_dados: currentSnapshot as unknown as Json,
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: `gerou PDF ${label}`,
        });
      }

      return { relatorioId, novaRevisao: efetivaRevisao, mensagem: `PDF ${label} gerado (mesma revisão, sem alterações).` };
    },
    onSuccess: ({ relatorioId, mensagem }) => {
      invalidateRelatorio(relatorioId);
      toast.success(mensagem);
    },
    onError: (e: Error) => toast.error('Erro ao gerar PDF: ' + e.message),
  });

  /** Download direto pela listagem — mesmos dados, mesmo PDF. */
  const baixarDaLista = useMutation({
    mutationFn: async ({ relatorio, empresa }: DownloadListaInput) => {
      toast.info('Preparando PDF...');
      const { data: obra } = await supabase
        .from('obras')
        .select('*, clientes(nome, cpf_cnpj, email, telefone)')
        .eq('id', relatorio.obra_id)
        .maybeSingle();
      if (!obra) throw new Error('Obra do relatório não encontrada');

      const dados = await carregarDadosRelatorio(
        relatorio.obra_id,
        relatorio.data_inicio || '',
        relatorio.data_fim || '',
        { relatorioId: relatorio.id },
      );

      const [assinRes, versRes] = await Promise.all([
        supabase.from('assinaturas').select('*').eq('relatorio_id', relatorio.id).order('data_assinatura'),
        supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorio.id).order('numero_versao', { ascending: false }),
      ]);

      const pdfRevisao = relatorio.revisao_pdf || 0;
      const versoes = (versRes.data || []) as RelatorioVersao[];

      await gerarPDFRelatorio({
        empresa,
        obra: obra as unknown as ObraRelatorio,
        periodo: { inicio: relatorio.data_inicio || '', fim: relatorio.data_fim || '' },
        dados,
        assinaturas: (assinRes.data || []) as Assinatura[],
        versoes,
        revisao: pdfRevisao,
      });

      if (user && await isPrimeiroPdfDoUsuario(relatorio.id, user.id)) {
        const autorNome = await getNomeUsuario(user.id);
        const ultimaVersao = versoes[0];
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorio.id,
          numero_versao: ultimaVersao ? ultimaVersao.numero_versao + 1 : 1,
          criado_por: user.id,
          status: relatorio.status || 'rascunho',
          descricao_alteracao: `PDF gerado por ${autorNome}`,
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorio.id,
          usuario_id: user.id,
          acao: `gerou PDF ${revLabel(pdfRevisao)}`,
        });
      }

      return relatorio.id;
    },
    onSuccess: (relatorioId) => {
      invalidateRelatorio(relatorioId);
      toast.success('PDF baixado!');
    },
    onError: (e: Error) => toast.error('Erro ao baixar PDF: ' + e.message),
  });

  /** Assinatura digital: upload no bucket privado + versão + status assinado. */
  const assinar = useMutation({
    mutationFn: async ({ relatorioId, dataUrl, nome, cargo, tipo }: AssinarInput) => {
      const blob = await (await fetch(dataUrl)).blob();
      const filePath = `assinaturas/${relatorioId}/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from('anexos').upload(filePath, blob);
      if (upErr) throw upErr;

      const { error } = await supabase.from('assinaturas').insert({
        relatorio_id: relatorioId,
        tipo,
        nome_assinante: nome,
        cargo: cargo || null,
        tipo_assinatura: 'desenho',
        assinatura_url: filePath,
      });
      if (error) throw error;

      if (user) {
        const versoes = await fetchVersoes(relatorioId);
        const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorioId,
          numero_versao: nextVersion,
          criado_por: user.id,
          status: 'assinado',
          descricao_alteracao: `Assinado por ${nome}`,
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: 'assinou',
        });
      }

      await supabase.from('relatorios').update({ status: 'assinado' }).eq('id', relatorioId);
      return relatorioId;
    },
    onSuccess: (relatorioId) => {
      invalidateRelatorio(relatorioId);
      toast.success('Assinatura registrada!');
    },
    onError: (e: Error) => toast.error('Erro ao assinar: ' + e.message),
  });

  /** Soft-delete: libera os diários vinculados e preserva o histórico. */
  const excluir = useMutation({
    mutationFn: async (relatorioId: string) => {
      const { error } = await supabase.from('relatorios').update({ status: 'excluido' }).eq('id', relatorioId);
      if (error) throw error;

      await supabase.from('diario_obra').update({ relatorio_id: null }).eq('relatorio_id', relatorioId);

      if (user) {
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: 'excluiu',
        });
      }
      return relatorioId;
    },
    onSuccess: (relatorioId) => {
      invalidateRelatorio(relatorioId);
      toast.success('Relatório excluído com sucesso');
    },
    onError: () => toast.error('Erro ao excluir relatório'),
  });

  return { consolidar, salvar, gerarPdf, baixarDaLista, assinar, excluir };
}
