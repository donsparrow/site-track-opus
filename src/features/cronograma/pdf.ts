import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { downloadPdf } from '@/lib/pdfDownload';
import { setupPDFHelpers, MARGIN, BLUE } from '@/lib/pdfShared';
import type { Atividade, EmpresaConfigPdf } from './types';
import { statusLabels } from './types';

export interface GanttData {
  minDate: Date;
  maxDate: Date;
  totalDays: number;
  validAtivs: Atividade[];
}

export interface ExportarCronogramaPdfArgs {
  empresaConfig: EmpresaConfigPdf | null;
  obraNome: string;
  atividades: Atividade[];
  progressoGeral: number;
  ganttData: GanttData | null;
}

/**
 * Gera e baixa o PDF do cronograma. Não faz nenhum fetch — recebe todos os
 * dados já carregados pelos hooks/página.
 */
export async function exportarCronogramaPdf({
  empresaConfig,
  obraNome,
  atividades,
  progressoGeral,
  ganttData,
}: ExportarCronogramaPdfArgs) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentW = pageWidth - MARGIN * 2;

  const helpers = await setupPDFHelpers(doc, empresaConfig);

  let y = helpers.addHeader();
  y += 4;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text(`Cronograma - ${obraNome}`, MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, MARGIN, y);
  doc.text(`Progresso Geral: ${progressoGeral}%`, MARGIN + 80, y);
  y += 6;

  const barW = contentW, barH = 6;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(MARGIN, y, barW, barH, 2, 2, 'F');
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(MARGIN, y, barW * (progressoGeral / 100), barH, 2, 2, 'F');
  y += 12;

  doc.setTextColor(0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Atividade', 'Peso', 'Início', 'Fim', 'Progresso', 'Status']],
    body: atividades.map((a, i) => [
      i + 1,
      a.nome_atividade,
      `${a.peso}%`,
      a.data_inicio ? format(parseISO(a.data_inicio), 'dd/MM/yyyy') : '-',
      a.data_fim ? format(parseISO(a.data_fim), 'dd/MM/yyyy') : '-',
      `${a.percentual_concluido}%`,
      statusLabels[a.status] || a.status,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
    margin: { left: MARGIN, right: MARGIN },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: 'striped',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 100;

  if (ganttData) {
    let gY = finalY + 10;
    if (gY > pageHeight - 40) {
      doc.addPage();
      gY = helpers.addHeader() + 4;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text('Gráfico de Gantt', MARGIN, gY);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    gY += 6;

    const chartX = MARGIN + 50;
    const chartW = contentW - 50;
    const rowH = 8;
    ganttData.validAtivs.forEach((a, i) => {
      const barY = gY + i * (rowH + 2);
      if (barY > pageHeight - 20) return;
      const start = differenceInDays(parseISO(a.data_inicio!), ganttData.minDate);
      const duration = Math.max(differenceInDays(parseISO(a.data_fim!), parseISO(a.data_inicio!)), 1);
      const barStart = chartX + (start / ganttData.totalDays) * chartW;
      const barWidth = Math.max((duration / ganttData.totalDays) * chartW, 4);

      doc.setFontSize(7);
      doc.text(a.nome_atividade, MARGIN, barY + 5.5, { maxWidth: 48 });

      doc.setFillColor(219, 234, 254);
      doc.roundedRect(barStart, barY, barWidth, rowH, 1, 1, 'F');
      const fillW = barWidth * (a.percentual_concluido / 100);
      if (fillW > 0) {
        doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
        doc.roundedRect(barStart, barY, fillW, rowH, 1, 1, 'F');
      }
      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.text(`${a.percentual_concluido}%`, barStart + barWidth + 2, barY + 5.5);
    });
  }

  helpers.addAllFooters();

  const nome = obraNome.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  downloadPdf(doc, `cronograma_${nome}.pdf`);
}
