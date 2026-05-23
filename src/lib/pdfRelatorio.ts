import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadPdf } from './pdfDownload';

interface RelatorioPDFData {
  empresa: {
    nome_empresa?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    logo_url?: string;
    site?: string;
    instagram?: string;
    endereco?: string;
  } | null;
  obra: {
    nome: string;
    endereco: string;
    responsavel?: string;
    crea_cau?: string;
    cliente_nome: string;
    cliente_cpf_cnpj?: string;
    cliente_email?: string;
    cliente_telefone?: string;
  };
  periodo: { inicio: string; fim: string };
  prazos: {
    contratual: number;
    parados: number;
    ajustado: number;
    trabalhados: number;
    saldo: number;
    dataInicioReal: string;
    percentualTempo: number;
    percentualExecutado: number;
  };
  diarios: any[];
  equipe: any[];
  atividades: any[];
  materiais: any[];
  ocorrencias: any[];
  imagens: any[];
  cronograma: { nome_atividade: string; data_inicio: string | null; data_fim: string | null; percentual_concluido: number; status: string; peso?: number; tipo_atividade?: string }[];
  aditivos?: { descricao: string; dias_adicionais: number; data_aprovacao?: string | null; justificativa?: string | null; responsavel_aprovacao?: string | null }[];
  planejamentoConfigurado?: boolean;
  assinaturas: any[];
  versao?: number;
  versoes?: { rev: string; data: string; resumo: string }[];
}

const fmt = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
};

const BLUE = [30, 58, 95] as const;
const MARGIN = 15;

async function loadImageAsDataUrl(url: string): Promise<string | null> {
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
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

async function loadImageAsPngDataUrl(url: string): Promise<string | null> {
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
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function gerarRelatorioPDF(data: RelatorioPDFData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;

  const emp = data.empresa || {};
  const hasEmpresa = !!(emp.nome_empresa);
  const siteTxt = emp.site || 'www.engenhariajf.com.br';
  const instaTxt = emp.instagram || '@engenhariajf';

  // Pre-load logo
  let logoDataUrl: string | null = null;
  let logoNatW = 0;
  let logoNatH = 0;
  if (emp.logo_url) {
    logoDataUrl = await loadImageAsDataUrl(emp.logo_url);
    if (logoDataUrl) {
      await new Promise<void>((resolve) => {
        const tmpImg = new Image();
        tmpImg.onload = () => { logoNatW = tmpImg.naturalWidth; logoNatH = tmpImg.naturalHeight; resolve(); };
        tmpImg.onerror = () => resolve();
        tmpImg.src = logoDataUrl!;
      });
    }
  }

  // Calculate weighted progress
  const totalPeso = data.cronograma.reduce((s, c) => s + (c.peso || 0), 0);
  const progressoObra = data.cronograma.length > 0
    ? (totalPeso === 100
      ? Math.round(data.cronograma.reduce((s, c) => s + ((c.peso || 0) * c.percentual_concluido), 0) / 100)
      : Math.round(data.cronograma.reduce((s, c) => s + c.percentual_concluido, 0) / data.cronograma.length))
    : 0;

  // =========== HELPER FUNCTIONS ===========

  const addHeader = (): number => {
    if (!hasEmpresa) {
      doc.setDrawColor(200);
      doc.line(MARGIN, 15, pageW - MARGIN, 15);
      return 20;
    }
    let hx = MARGIN;
    const logoMaxH = 18;
    const logoMaxW = 30;
    if (logoDataUrl && logoNatW > 0 && logoNatH > 0) {
      try {
        const ratio = logoNatW / logoNatH;
        let logoW = logoMaxH * ratio;
        let logoH = logoMaxH;
        if (logoW > logoMaxW) { logoW = logoMaxW; logoH = logoMaxW / ratio; }
        doc.addImage(logoDataUrl, 'PNG', MARGIN, 6, logoW, logoH);
        hx = MARGIN + logoW + 4;
      } catch { /* skip */ }
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(emp.nome_empresa || '', hx, 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const infoParts = [
      emp.cnpj ? `CNPJ: ${emp.cnpj}` : '',
      emp.telefone ? `Tel: ${emp.telefone}` : '',
      emp.email || '',
    ].filter(Boolean);
    doc.text(infoParts.join('  |  '), hx, 19);
    if (emp.endereco) doc.text(emp.endereco, hx, 23);
    doc.setTextColor(0);
    doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 27, pageW - MARGIN, 27);
    doc.setLineWidth(0.2);
    return 32;
  };

  const addFooter = (pageNum?: number) => {
    const footerY = pageH - 10;
    doc.setDrawColor(180);
    doc.line(MARGIN, footerY - 4, pageW - MARGIN, footerY - 4);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`${siteTxt} | ${instaTxt}`, MARGIN, footerY);
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
    if (y + needed > pageH - 18) newPage();
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

  // =========== COVER PAGE ===========
  currentPage = 1;

  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageW, pageH, 'F');

  let coverY = 40;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', pageW / 2 - 20, coverY, 40, 40);
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

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text('RELATÓRIO DE OBRA', pageW / 2, coverY, { align: 'center' });
  coverY += 12;

  if (data.versao !== undefined) {
    const revLabel = `REV ${String(data.versao).padStart(2, '0')}`;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(revLabel, pageW / 2, coverY, { align: 'center' });
    coverY += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Versão ${data.versao}`, pageW / 2, coverY, { align: 'center' });
    coverY += 8;
  }

  coverY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);

  const coverInfo = [
    { label: 'Obra', value: data.obra.nome },
    { label: 'Cliente', value: data.obra.cliente_nome || '—' },
    { label: 'Endereço', value: data.obra.endereco || '—' },
    { label: 'Responsável Técnico', value: `${data.obra.responsavel || '—'}${data.obra.crea_cau ? ' — ' + data.obra.crea_cau : ''}` },
    { label: 'Data de Emissão', value: new Date().toLocaleDateString('pt-BR') },
  ];

  coverInfo.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${item.label}:`, pageW / 2 - 60, coverY);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, pageW / 2 + 5, coverY);
    coverY += 8;
  });

  // =========== PAGE 2: EXECUTIVE SUMMARY ===========
  newPage();
  sectionTitle('1. RESUMO EXECUTIVO');

  // Smart status: progresso físico vs prazo consumido (tolerância ±5%)
  const pExec = data.prazos.percentualExecutado;
  const pTime = data.prazos.percentualTempo;
  const desvio = pExec - pTime;
  const statusObra = (!data.prazos.dataInicioReal) ? 'Não iniciada'
    : (desvio > 5) ? 'Adiantada'
    : (desvio >= -5) ? 'Em Dia'
    : 'Atrasada';
  const statusColor = statusObra === 'Adiantada' ? [34, 197, 94] : statusObra === 'Em Dia' ? [234, 179, 8] : statusObra === 'Atrasada' ? [239, 68, 68] : [150, 150, 150];

  // Status box
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(MARGIN, y, 8, 8, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusObra, MARGIN + 12, y + 6);
  y += 14;

  // Summary info
  doc.setTextColor(0);
  doc.setFontSize(9);

  const desvioStr = `${desvio > 0 ? '+' : ''}${desvio}%`;
  const summaryData = [
    ['Progresso Físico Executado', `${pExec}%`],
    ['Prazo Consumido', `${pTime}%`],
    ['Desvio', desvioStr],
    ['Status da Obra', statusObra],
    ['Período do Relatório', `${fmt(data.periodo.inicio)} a ${fmt(data.periodo.fim)}`],
    ['Dias Trabalhados', `${data.prazos.trabalhados}`],
    ['Dias Parados', `${data.prazos.parados}`],
    ['Diários Registrados', `${data.diarios.length}`],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: 'plain',
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Comparative bars: Planejado x Executado
  checkPage(28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Planejado x Executado:', MARGIN, y);
  y += 5;
  const cmpBarW = contentW;
  // Planejado (prazo consumido)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Planejado (Prazo Consumido): ${pTime}%`, MARGIN, y);
  y += 3;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(MARGIN, y, cmpBarW, 5, 1.5, 1.5, 'F');
  if (pTime > 0) {
    doc.setFillColor(148, 163, 184);
    doc.roundedRect(MARGIN, y, cmpBarW * Math.min(pTime, 100) / 100, 5, 1.5, 1.5, 'F');
  }
  y += 8;
  doc.text(`Executado (Progresso Físico): ${pExec}%`, MARGIN, y);
  y += 3;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(MARGIN, y, cmpBarW, 5, 1.5, 1.5, 'F');
  if (pExec > 0) {
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(MARGIN, y, cmpBarW * Math.min(pExec, 100) / 100, 5, 1.5, 1.5, 'F');
  }
  y += 8;

  // Progress bar
  checkPage(15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Progresso da Obra:', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${progressoObra}%`, MARGIN + 40, y);
  y += 4;
  const pBarW = contentW;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(MARGIN, y, pBarW, 5, 1.5, 1.5, 'F');
  if (progressoObra > 0) {
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.roundedRect(MARGIN, y, pBarW * (progressoObra / 100), 5, 1.5, 1.5, 'F');
  }
  y += 10;

  // Main activities summary
  if (data.atividades.length > 0) {
    checkPage(15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text('Principais Atividades do Período', MARGIN, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 5;

    // Get unique activities with their latest progress
    const actMap = new Map<string, number>();
    data.diarios.forEach(d => {
      data.atividades.filter(a => a.diario_id === d.id).forEach(a => {
        actMap.set(a.descricao, a.percentual || 0);
      });
    });

    Array.from(actMap.entries()).slice(0, 8).forEach(([desc, perc]) => {
      checkPage(6);
      doc.setFontSize(9);
      doc.text(`• ${desc}: ${perc}%`, MARGIN + 2, y);
      y += 5;
    });
    y += 3;
  }

  // =========== IDENTIFICATION ===========
  sectionTitle('2. IDENTIFICAÇÃO');
  infoRow('Obra', data.obra.nome);
  infoRow('Endereço', data.obra.endereco);
  infoRow('Responsável Técnico', `${data.obra.responsavel || '—'}${data.obra.crea_cau ? ' — ' + data.obra.crea_cau : ''}`);
  y += 3;

  // CLIENT DATA
  if (data.obra.cliente_nome) {
    sectionTitle('3. DADOS DO CLIENTE');
    infoRow('Nome', data.obra.cliente_nome);
    infoRow('CNPJ/CPF', data.obra.cliente_cpf_cnpj || '—');
    infoRow('E-mail', data.obra.cliente_email || '—');
    infoRow('Telefone', data.obra.cliente_telefone || '—');
    y += 3;
  }

  // PERIOD
  sectionTitle('4. PERÍODO DO RELATÓRIO');
  infoRow('Data Inicial', fmt(data.periodo.inicio));
  infoRow('Data Final', fmt(data.periodo.fim));
  y += 3;

  // =========== DEADLINE CONTROL (VISUAL) ===========
  sectionTitle('5. CONTROLE DE PRAZO');

  // Visual status indicator
  checkPage(25);
  const prazoStatusLabel = statusObra.toUpperCase();
  const prazoStatusClr = statusColor;

  doc.setFillColor(prazoStatusClr[0], prazoStatusClr[1], prazoStatusClr[2]);
  doc.roundedRect(MARGIN, y, contentW, 10, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(prazoStatusLabel, pageW / 2, y + 7, { align: 'center' });
  y += 14;

  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');

  // Prazo grid (4 columns)
  const colW = contentW / 4;
  const fmtDate = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); } catch { return d; } };
  const prazoItems = [
    { label: 'Início Real', value: data.prazos.dataInicioReal ? fmtDate(data.prazos.dataInicioReal) : 'Não iniciada' },
    { label: 'Prazo Contratual', value: `${data.prazos.contratual} dias` },
    { label: 'Prazo Ajustado', value: `${data.prazos.ajustado} dias` },
    { label: 'Saldo de Prazo', value: `${data.prazos.saldo} dias` },
  ];

  prazoItems.forEach((item, i) => {
    const x = MARGIN + i * colW;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x + 1, y, colW - 2, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(item.label, x + colW / 2, y + 5, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(i === 3 ? prazoStatusClr[0] : BLUE[0], i === 3 ? prazoStatusClr[1] : BLUE[1], i === 3 ? prazoStatusClr[2] : BLUE[2]);
    doc.text(item.value, x + colW / 2, y + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  });
  y += 22;

  // Second row
  const prazoItems2 = [
    { label: 'Dias Parados', value: `${data.prazos.parados}` },
    { label: 'Dias Trabalhados', value: `${data.prazos.trabalhados}` },
    { label: 'Prazo Consumido', value: `${data.prazos.percentualTempo}%`, highlight: true },
    { label: 'Progresso Físico', value: `${data.prazos.percentualExecutado}%`, highlight: true },
  ];
  const col2W = contentW / 4;
  prazoItems2.forEach((item: any, i: number) => {
    const x = MARGIN + i * col2W;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x + 1, y, col2W - 2, 14, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(item.label, x + col2W / 2, y + 5, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if (item.highlight) {
      const clr = i === 3 ? (data.prazos.percentualExecutado >= data.prazos.percentualTempo ? [34, 197, 94] : [239, 68, 68]) : [100, 100, 100];
      doc.setTextColor(clr[0], clr[1], clr[2]);
    } else {
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    }
    doc.text(item.value, x + col2W / 2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  });
  y += 20;

  // =========== SERVICES (SIMPLIFIED) ===========
  if (data.atividades.length > 0) {
    sectionTitle('6. DESCRIÇÃO DOS SERVIÇOS');

    // Group by day, simplified format
    const daysWithActivities = data.diarios
      .map(d => ({
        data: d.data,
        atividades: data.atividades.filter(a => a.diario_id === d.id),
      }))
      .filter(d => d.atividades.length > 0);

    if (daysWithActivities.length > 0) {
      const rows: string[][] = [];
      daysWithActivities.forEach(dia => {
        dia.atividades.forEach((a: any, idx: number) => {
          rows.push([
            idx === 0 ? fmt(dia.data) : '',
            a.descricao,
            `${a.percentual || 0}%`,
            a.status === 'concluido' ? 'Concluído' : a.status === 'andamento' ? 'Em andamento' : a.status || '—',
          ]);
        });
      });

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Atividade', 'Progresso', 'Status']],
        body: rows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        theme: 'striped',
        columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 22, halign: 'center' }, 3: { cellWidth: 25 } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // =========== TEAM (IMPROVED) ===========
  if (data.equipe.length > 0) {
    sectionTitle('7. EQUIPE');

    const diasComEquipe = data.diarios.map(d => ({
      data: d.data,
      equipe: data.equipe.filter(e => e.diario_id === d.id),
    })).filter(d => d.equipe.length > 0);

    if (diasComEquipe.length > 0) {
      const counts = diasComEquipe.map(d => d.equipe.length);
      const media = Math.round(counts.reduce((s, c) => s + c, 0) / counts.length);
      const maximo = Math.max(...counts);
      const minimo = Math.min(...counts);

      checkPage(25);

      // Summary boxes
      const teamColW = contentW / 3;
      const teamItems = [
        { label: 'Equipe Média', value: `${media} pessoas` },
        { label: 'Máximo', value: `${maximo} pessoas` },
        { label: 'Mínimo', value: `${minimo} pessoas` },
      ];
      teamItems.forEach((item, i) => {
        const x = MARGIN + i * teamColW;
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(x + 1, y, teamColW - 2, 14, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(item.label, x + teamColW / 2, y + 5, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
        doc.text(item.value, x + teamColW / 2, y + 12, { align: 'center' });
        doc.setFont('helvetica', 'normal');
      });
      y += 20;

      // Composition summary by function
      const funcMap = new Map<string, number>();
      data.equipe.forEach(e => {
        const key = e.funcao || 'Sem função';
        funcMap.set(key, (funcMap.get(key) || 0) + 1);
      });
      if (funcMap.size > 0) {
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Composição:', MARGIN, y);
        doc.setFont('helvetica', 'normal');
        y += 5;
        Array.from(funcMap.entries()).forEach(([funcao, count]) => {
          checkPage(5);
          doc.text(`• ${funcao}: ${count} registro(s)`, MARGIN + 2, y);
          y += 4;
        });
        y += 4;
      }
    }
  }

  // MATERIALS
  if (data.materiais.length > 0) {
    sectionTitle('8. MATERIAIS UTILIZADOS');
    checkPage(20);
    autoTable(doc, {
      startY: y,
      head: [['Material', 'Quantidade', 'Unidade']],
      body: data.materiais.map(m => [m.material, String(m.quantidade || 0), m.unidade || 'un']),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // OCCURRENCES
  if (data.ocorrencias.length > 0) {
    sectionTitle('9. OCORRÊNCIAS');
    checkPage(20);
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Impacto']],
      body: data.ocorrencias.map(o => [o.descricao, o.impacto]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========== CRONOGRAMA ===========
  if (data.cronograma.length > 0) {
    newPage();
    sectionTitle('10. CRONOGRAMA DA OBRA');

    // Overall progress
    checkPage(12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Progresso Geral: ${progressoObra}%`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 4;
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(MARGIN, y, contentW, 4, 1, 1, 'F');
    if (progressoObra > 0) {
      doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
      doc.roundedRect(MARGIN, y, contentW * (progressoObra / 100), 4, 1, 1, 'F');
    }
    y += 10;

    const statusMap: Record<string, string> = { nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído' };

    autoTable(doc, {
      startY: y,
      head: [['Atividade', 'Peso', 'Início', 'Fim', 'Progresso', 'Status']],
      body: data.cronograma.map(c => [
        c.nome_atividade,
        `${c.peso || 0}%`,
        c.data_inicio ? fmt(c.data_inicio) : '—',
        c.data_fim ? fmt(c.data_fim) : '—',
        `${c.percentual_concluido}%`,
        statusMap[c.status] || c.status,
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Gantt bars
    const validCron = data.cronograma.filter(c => c.data_inicio && c.data_fim);
    if (validCron.length > 0) {
      checkPage(validCron.length * 10 + 15);
      y += 2;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
      doc.text('Gráfico de Gantt', MARGIN, y);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      y += 6;

      const allDates = validCron.flatMap(c => [new Date(c.data_inicio + 'T00:00:00'), new Date(c.data_fim + 'T00:00:00')]);
      const minD = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxD = new Date(Math.max(...allDates.map(d => d.getTime())));
      const totalDays = Math.max(Math.round((maxD.getTime() - minD.getTime()) / 86400000), 1);
      const chartX = MARGIN + 50;
      const chartW = contentW - 50;
      const rowH = 7;

      validCron.forEach(c => {
        if (y > pageH - 25) return;
        const s = new Date(c.data_inicio + 'T00:00:00');
        const e = new Date(c.data_fim + 'T00:00:00');
        const startOff = Math.round((s.getTime() - minD.getTime()) / 86400000);
        const dur = Math.max(Math.round((e.getTime() - s.getTime()) / 86400000), 1);
        const barStart = chartX + (startOff / totalDays) * chartW;
        const barWidth = Math.max((dur / totalDays) * chartW, 4);

        doc.setFontSize(7);
        doc.text(c.nome_atividade, MARGIN, y + 4.5, { maxWidth: 48 });

        doc.setFillColor(219, 234, 254);
        doc.roundedRect(barStart, y, barWidth, rowH, 1, 1, 'F');
        const fillW = barWidth * (c.percentual_concluido / 100);
        if (fillW > 0) {
          doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
          doc.roundedRect(barStart, y, fillW, rowH, 1, 1, 'F');
        }
        doc.setFontSize(6);
        doc.setTextColor(0);
        doc.text(`${c.percentual_concluido}%`, barStart + barWidth + 2, y + 4.5);
        y += rowH + 2;
      });
      y += 4;
    }
  } else if (data.planejamentoConfigurado === false) {
    newPage();
    sectionTitle('10. CRONOGRAMA DA OBRA');
    checkPage(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120);
    doc.text('Planejamento ainda não configurado no Cronograma da obra.', MARGIN, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 10;
  }

  // =========== ADITIVOS ===========
  if (data.aditivos && data.aditivos.length > 0) {
    checkPage(30);
    y += 4;
    sectionTitle('10.1 ADITIVOS DA OBRA');
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Dias Adicionais', 'Aprovação', 'Responsável']],
      body: data.aditivos.map(a => [
        a.descricao || '—',
        `${a.dias_adicionais || 0} dias`,
        a.data_aprovacao ? fmt(a.data_aprovacao) : '—',
        a.responsavel_aprovacao || '—',
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    const totalDias = data.aditivos.reduce((s, a) => s + (a.dias_adicionais || 0), 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de dias adicionados ao prazo: ${totalDias} dias`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  }


  // =========== PHOTO SECTION ===========
  if (data.imagens.length > 0) {
    newPage();
    sectionTitle('11. REGISTRO FOTOGRÁFICO');

    const imgW = (contentW - 8) / 2;
    const imgH = imgW * 0.75;
    let figNum = 1;

    for (let i = 0; i < data.imagens.length; i += 2) {
      checkPage(imgH + 14);

      for (let col = 0; col < 2; col++) {
        const idx = i + col;
        if (idx >= data.imagens.length) break;
        const img = data.imagens[idx];
        const xPos = MARGIN + col * (imgW + 8);

        try {
          const imgDataUrl = await loadImageAsDataUrl(img.url);
          if (imgDataUrl) {
            doc.setDrawColor(200);
            doc.rect(xPos, y, imgW, imgH);
            doc.addImage(imgDataUrl, 'PNG', xPos + 0.5, y + 0.5, imgW - 1, imgH - 1);
          }
        } catch {
          doc.setDrawColor(200);
          doc.rect(xPos, y, imgW, imgH);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('Imagem indisponível', xPos + imgW / 2, y + imgH / 2, { align: 'center' });
          doc.setTextColor(0);
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60);
        const caption = `Figura ${figNum}` + (img.descricao ? ` – ${img.descricao}` : '');
        doc.text(caption, xPos, y + imgH + 4, { maxWidth: imgW });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        figNum++;
      }

      y += imgH + 12;
    }
  }

  // =========== REVISION HISTORY (SIMPLIFIED) ===========
  if (data.versoes && data.versoes.length > 0) {
    checkPage(30);
    sectionTitle('12. HISTÓRICO DE REVISÕES');

    // Simplified format
    data.versoes.forEach(v => {
      checkPage(8);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${v.rev}`, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.text(` — ${v.resumo}`, MARGIN + 18, y);
      doc.setTextColor(120);
      doc.text(v.data, pageW - MARGIN, y, { align: 'right' });
      doc.setTextColor(0);
      y += 6;
    });
    y += 4;
  }

  // =========== SIGNATURES ===========
  newPage();
  sectionTitle('13. ASSINATURAS');
  y += 5;

  if (data.assinaturas.length > 0) {
    const sigWidth = contentW / 2 - 10;
    const techSigs = data.assinaturas.filter(a => a.tipo === 'responsavel_tecnico');
    const clientSigs = data.assinaturas.filter(a => a.tipo === 'cliente');

    const renderSigBlock = async (sig: any, xPos: number) => {
      try {
        const sigDataUrl = await loadImageAsPngDataUrl(sig.assinatura_url);
        if (sigDataUrl) {
          doc.addImage(sigDataUrl, 'PNG', xPos, y, 50, 20);
        } else {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('Assinatura não disponível', xPos, y + 10);
          doc.setTextColor(0);
        }
      } catch {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Assinatura não disponível', xPos, y + 10);
        doc.setTextColor(0);
      }
      const sigY = y + 22;
      doc.setDrawColor(0);
      doc.line(xPos, sigY, xPos + sigWidth, sigY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(sig.nome_assinante, xPos, sigY + 5);
      doc.setFont('helvetica', 'normal');
      if (sig.cargo) doc.text(sig.cargo, xPos, sigY + 10);
      doc.text(`Data: ${fmt(sig.data_assinatura)}`, xPos, sigY + (sig.cargo ? 15 : 10));
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(sig.tipo === 'responsavel_tecnico' ? 'RESPONSÁVEL TÉCNICO' : 'CLIENTE', xPos, sigY + (sig.cargo ? 20 : 15));
      doc.setTextColor(0);
    };

    const leftX = MARGIN;
    const rightX = MARGIN + sigWidth + 20;

    if (techSigs.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('RESPONSÁVEL TÉCNICO', leftX, y);
      y += 6;
      for (const sig of techSigs) {
        checkPage(45);
        await renderSigBlock(sig, leftX);
        y += 40;
      }
    }

    if (clientSigs.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE', techSigs.length > 0 ? rightX : leftX, y - (techSigs.length > 0 ? 40 * techSigs.length + 6 : 0));

      for (const sig of clientSigs) {
        checkPage(45);
        await renderSigBlock(sig, techSigs.length > 0 ? rightX : leftX);
        y += 40;
      }
    }
  } else {
    const blockW = contentW / 2 - 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text('RESPONSÁVEL TÉCNICO', MARGIN, y);
    doc.setTextColor(0);
    y += 20;
    doc.setDrawColor(0);
    doc.line(MARGIN, y, MARGIN + blockW, y);
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura', MARGIN, y); y += 4;
    doc.text('Nome:', MARGIN, y); y += 4;
    doc.text('Cargo:', MARGIN, y); y += 4;
    doc.text('Data:', MARGIN, y);

    const rightX = MARGIN + blockW + 20;
    let cy = y - 32;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text('CLIENTE', rightX, cy);
    doc.setTextColor(0);
    cy += 20;
    doc.line(rightX, cy, rightX + blockW, cy);
    cy += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura', rightX, cy); cy += 4;
    doc.text('Nome:', rightX, cy); cy += 4;
    doc.text('Data:', rightX, cy);

    y += 10;
  }

  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i === 1 ? undefined : i - 1);
  }

  const hoje = new Date();
  const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
  const nomeObra = data.obra.nome.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fileName = `relatorio_${nomeObra}_${dataFormatada}.pdf`;

  downloadPdf(doc, fileName);
}
