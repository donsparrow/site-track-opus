import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { downloadPdf } from '@/lib/pdfDownload';
import { fmt } from './utils';
import type { DespesaComObra, FinanceiroAnexo, ReceitaComObra } from './types';

/** Gera o relatório contábil de notas fiscais/boletos anexados. */
export function gerarRelatorioNotas(
  anexos: FinanceiroAnexo[],
  receitas: ReceitaComObra[],
  despesas: DespesaComObra[],
) {
  if (anexos.length === 0) {
    toast.info('Nenhum documento anexado encontrado.');
    return;
  }

  const items = anexos.map((a) => {
    const receita = receitas.find((r) => r.id === a.registro_id);
    const despesa = despesas.find((d) => d.id === a.registro_id);
    const ref = receita || despesa;
    const isReceita = a.tipo_registro === 'receita';
    return {
      tipo: isReceita ? 'Receita' : 'Despesa',
      obra: ref?.obras?.nome || '—',
      descricao: ref?.descricao || '—',
      valor: isReceita ? Number(receita?.valor_total || 0) : Number(despesa?.valor || 0),
      data: (isReceita ? receita?.created_at?.split('T')[0] : despesa?.data) || '',
      arquivo: a.nome_arquivo,
      tipo_doc: a.tipo_anexo === 'nota_fiscal' ? 'Nota Fiscal' : 'Boleto',
    };
  });

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Relatório de Notas Fiscais', 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [['Tipo', 'Obra', 'Descrição', 'Valor', 'Data', 'Arquivo', 'Tipo Doc']],
    body: items.map((i) => [
      i.tipo,
      i.obra,
      i.descricao,
      fmt(i.valor),
      i.data ? new Date(i.data + 'T00:00:00').toLocaleDateString('pt-BR') : '',
      i.arquivo,
      i.tipo_doc,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  downloadPdf(doc, 'relatorio_notas_fiscais.pdf');
  toast.success('Relatório gerado com sucesso!');
}
