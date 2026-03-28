import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardPDFData {
  empresa: {
    nome_empresa?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    logo_url?: string;
    endereco?: string;
    site?: string;
    instagram?: string;
  } | null;
  obra: {
    nome: string;
    endereco?: string;
    responsavel?: string;
    status: string;
    data_inicio?: string;
    data_fim_prevista?: string;
    cliente_nome?: string;
    anotacoes?: string;
  };
  financeiro: {
    contrato: number;
    recebido: number;
    aReceber: number;
    gasto: number;
    saldo: number;
  };
  parcelas: {
    numero_parcela: number;
    valor: number;
    data_vencimento: string;
    status: string;
    forma_pagamento: string | null;
  }[];
  prazos: {
    contratual: number | null;
    saldoPrazo: number | null;
  };
  chartImage: string | null;
}

const BLUE = [30, 58, 95] as const;
const MARGIN = 15;

const fmtCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const fmtDate = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
};

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else resolve(null);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch { return null; }
}

export async function gerarDashboardPDF(data: DashboardPDFData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;

  const emp = data.empresa || {};
  const hasEmpresa = !!emp.nome_empresa;

  let logoDataUrl: string | null = null;
  if (emp.logo_url) {
    logoDataUrl = await loadImageAsDataUrl(emp.logo_url);
  }

  // Helpers
  const addHeader = (): number => {
    if (!hasEmpresa) {
      doc.setDrawColor(200);
      doc.line(MARGIN, 15, pageW - MARGIN, 15);
      return 20;
    }
    let hx = MARGIN;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'JPEG', MARGIN, 8, 18, 18);
        hx = MARGIN + 22;
      } catch { /* skip */ }
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(emp.nome_empresa || '', hx, 15);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const info = [
      emp.cnpj ? `CNPJ: ${emp.cnpj}` : '',
      emp.telefone ? `Tel: ${emp.telefone}` : '',
      emp.email || '',
    ].filter(Boolean).join('  |  ');
    doc.text(info, hx, 20);
    doc.setTextColor(0);
    doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 25, pageW - MARGIN, 25);
    doc.setLineWidth(0.2);
    return 30;
  };

  const addFooter = (pageNum?: number) => {
    const footerY = pageH - 10;
    doc.setDrawColor(180);
    doc.line(MARGIN, footerY - 4, pageW - MARGIN, footerY - 4);
    doc.setFontSize(7);
    doc.setTextColor(120);
    const siteTxt = emp.site || '';
    const instaTxt = emp.instagram || '';
    const footerTxt = [siteTxt, instaTxt].filter(Boolean).join(' | ');
    if (footerTxt) doc.text(footerTxt, pageW / 2, footerY, { align: 'center' });
    if (pageNum) doc.text(`Página ${pageNum}`, pageW - MARGIN, footerY, { align: 'right' });
    doc.setTextColor(0);
  };

  let currentPage = 0;
  let y = 0;

  const newPage = () => {
    if (currentPage > 0) doc.addPage();
    currentPage++;
    y = addHeader();
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 18) {
      addFooter(currentPage);
      newPage();
    }
  };

  const sectionTitle = (title: string) => {
    checkPage(15);
    y += 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(title, MARGIN, y);
    y += 2;
    doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, MARGIN + 65, y);
    doc.setLineWidth(0.2);
    y += 5;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
  };

  const infoRow = (label: string, value: string) => {
    checkPage(6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '—', MARGIN + 45, y);
    y += 5;
  };

  // ===== COVER PAGE =====
  currentPage = 1;
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageW, pageH, 'F');

  let coverY = 40;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', pageW / 2 - 20, coverY, 40, 40);
      coverY += 48;
    } catch { coverY += 10; }
  }

  if (hasEmpresa) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(emp.nome_empresa || '', pageW / 2, coverY, { align: 'center' });
    coverY += 12;
  }

  doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setLineWidth(1);
  doc.line(pageW / 2 - 40, coverY, pageW / 2 + 40, coverY);
  doc.setLineWidth(0.2);
  coverY += 15;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text('RELATÓRIO EXECUTIVO', pageW / 2, coverY, { align: 'center' });
  coverY += 8;
  doc.setFontSize(14);
  doc.text('DASHBOARD DA OBRA', pageW / 2, coverY, { align: 'center' });
  coverY += 20;

  const statusLabels: Record<string, string> = {
    planejamento: 'Planejamento',
    andamento: 'Em Andamento',
    concluida: 'Concluída',
  };

  const coverItems = [
    { label: 'Obra', value: data.obra.nome },
    { label: 'Cliente', value: data.obra.cliente_nome || '—' },
    { label: 'Endereço', value: data.obra.endereco || '—' },
    { label: 'Status', value: statusLabels[data.obra.status] || data.obra.status },
    { label: 'Data de Emissão', value: new Date().toLocaleDateString('pt-BR') },
  ];

  doc.setFontSize(10);
  doc.setTextColor(40);
  coverItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.label}:`, pageW / 2 - 60, coverY);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, pageW / 2 + 5, coverY);
    coverY += 8;
  });

  addFooter();

  // ===== PAGE 2: CONTENT =====
  newPage();

  // Identification
  sectionTitle('1. IDENTIFICAÇÃO DA OBRA');
  infoRow('Obra', data.obra.nome);
  infoRow('Cliente', data.obra.cliente_nome || '—');
  infoRow('Endereço', data.obra.endereco || '—');
  infoRow('Responsável', data.obra.responsavel || '—');
  infoRow('Status', statusLabels[data.obra.status] || data.obra.status);
  if (data.obra.data_inicio) infoRow('Início', fmtDate(data.obra.data_inicio));
  if (data.obra.data_fim_prevista) infoRow('Previsão Término', fmtDate(data.obra.data_fim_prevista));
  y += 3;

  // Prazos
  sectionTitle('2. CONTROLE DE PRAZOS');
  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Prazo Contratual (dias)', data.prazos.contratual != null ? String(data.prazos.contratual) : '—'],
      ['Saldo de Prazo (dias)', data.prazos.saldoPrazo != null ? String(data.prazos.saldoPrazo) : '—'],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: 'striped',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Financial Summary
  sectionTitle('3. RESUMO FINANCEIRO');
  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total Contrato', fmtCurrency(data.financeiro.contrato)],
      ['Recebido', fmtCurrency(data.financeiro.recebido)],
      ['A Receber', fmtCurrency(data.financeiro.aReceber)],
      ['Custos / Gastos', fmtCurrency(data.financeiro.gasto)],
      ['Saldo', fmtCurrency(data.financeiro.saldo)],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: 'striped',
    didParseCell: (hookData) => {
      // Highlight saldo row
      if (hookData.section === 'body' && hookData.row.index === 4) {
        hookData.cell.styles.fontStyle = 'bold';
        if (data.financeiro.saldo < 0) {
          hookData.cell.styles.textColor = [200, 50, 50];
        } else {
          hookData.cell.styles.textColor = [30, 130, 70];
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Chart
  if (data.chartImage) {
    sectionTitle('4. GRÁFICO FINANCEIRO');
    checkPage(80);
    try {
      doc.addImage(data.chartImage, 'PNG', MARGIN + 10, y, contentW - 20, 70);
      y += 78;
    } catch { /* skip chart */ }
  }

  // Parcelas
  if (data.parcelas.length > 0) {
    sectionTitle(data.chartImage ? '5. PARCELAS' : '4. PARCELAS');
    checkPage(20);

    const statusLabel = (s: string) => {
      if (s === 'recebido') return 'Recebido';
      if (s === 'atrasado') return 'Atrasado';
      return 'Pendente';
    };

    autoTable(doc, {
      startY: y,
      head: [['Nº', 'Valor', 'Vencimento', 'Status', 'Forma Pgto']],
      body: data.parcelas.map(p => [
        String(p.numero_parcela),
        fmtCurrency(p.valor),
        fmtDate(p.data_vencimento),
        statusLabel(p.status),
        p.forma_pagamento || '—',
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'striped',
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 3) {
          const val = hookData.cell.raw as string;
          if (val === 'Atrasado') hookData.cell.styles.textColor = [200, 50, 50];
          else if (val === 'Recebido') hookData.cell.styles.textColor = [30, 130, 70];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Anotações
  if (data.obra.anotacoes) {
    const secNum = data.chartImage
      ? (data.parcelas.length > 0 ? '6' : '5')
      : (data.parcelas.length > 0 ? '5' : '4');
    sectionTitle(`${secNum}. ANOTAÇÕES DA OBRA`);

    // Strip HTML tags for plain text in PDF
    const plainText = data.obra.anotacoes
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (plainText) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(plainText, contentW);
      for (const line of lines) {
        checkPage(5);
        doc.text(line, MARGIN, y);
        y += 4.5;
      }
    }
  }

  // Footer on all pages
  addFooter(currentPage);
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i - 1);
  }

  // Save
  const hoje = new Date();
  const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
  const nomeObra = data.obra.nome.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fileName = `relatorio_dashboard_${nomeObra}_${dataFormatada}.pdf`;

  downloadPdf(doc, fileName);
}
