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
  };
  diarios: any[];
  equipe: any[];
  atividades: any[];
  materiais: any[];
  ocorrencias: any[];
  imagens: any[];
  cronograma: { nome_atividade: string; data_inicio: string | null; data_fim: string | null; percentual_concluido: number; status: string }[];
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
            // Use transparent background (PNG) to preserve logo transparency
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
  // If it's already a data URL (from canvas signature), return as-is
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

  // Pre-load logo and cache dimensions
  let logoDataUrl: string | null = null;
  let logoNatW = 0;
  let logoNatH = 0;
  if (emp.logo_url) {
    logoDataUrl = await loadImageAsDataUrl(emp.logo_url);
    if (logoDataUrl) {
      await new Promise<void>((resolve) => {
        const tmpImg = new Image();
        tmpImg.onload = () => {
          logoNatW = tmpImg.naturalWidth;
          logoNatH = tmpImg.naturalHeight;
          resolve();
        };
        tmpImg.onerror = () => resolve();
        tmpImg.src = logoDataUrl!;
      });
    }
  }

  // =========== HELPER FUNCTIONS ===========

  const addHeader = (): number => {
    if (!hasEmpresa) {
      doc.setDrawColor(200);
      doc.line(MARGIN, 15, pageW - MARGIN, 15);
      return 20;
    }
    let hx = MARGIN;
    const logoMaxH = 18; // mm
    const logoMaxW = 30; // mm
    if (logoDataUrl && logoNatW > 0 && logoNatH > 0) {
      try {
        const ratio = logoNatW / logoNatH;
        let logoW = logoMaxH * ratio;
        let logoH = logoMaxH;
        if (logoW > logoMaxW) {
          logoW = logoMaxW;
          logoH = logoMaxW / ratio;
        }
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
    if (emp.endereco) {
      doc.text(emp.endereco, hx, 23);
    }
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
    if (pageNum) {
      doc.text(`Página ${pageNum}`, pageW - MARGIN, footerY, { align: 'right' });
    }
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

  // =========== COVER PAGE ===========
  currentPage = 1;

  // Background subtle
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Logo centered
  let coverY = 40;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', pageW / 2 - 20, coverY, 40, 40);
      coverY += 48;
    } catch {
      coverY += 10;
    }
  }

  // Company name
  if (hasEmpresa) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(emp.nome_empresa || '', pageW / 2, coverY, { align: 'center' });
    coverY += 12;
  }

  // Decorative line
  doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setLineWidth(1);
  doc.line(pageW / 2 - 40, coverY, pageW / 2 + 40, coverY);
  doc.setLineWidth(0.2);
  coverY += 15;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text('RELATÓRIO DE OBRA', pageW / 2, coverY, { align: 'center' });
  coverY += 12;

  // REV label
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

  // Obra info on cover
  coverY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);

  const coverInfo = [
    { label: 'Obra', value: data.obra.nome },
    { label: 'Cliente', value: data.obra.cliente_nome || '—' },
    { label: 'Endereço', value: data.obra.endereco || '—' },
    { label: 'Responsável Técnico', value: data.obra.responsavel || '—' },
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

  // Footer added in final pass

  // =========== PAGE 2+: CONTENT ===========

  // IDENTIFICATION
  newPage();
  sectionTitle('1. IDENTIFICAÇÃO');
  infoRow('Obra', data.obra.nome);
  infoRow('Endereço', data.obra.endereco);
  infoRow('Responsável Técnico', data.obra.responsavel || '—');
  y += 3;

  // CLIENT DATA
  if (data.obra.cliente_nome) {
    sectionTitle('2. DADOS DO CLIENTE');
    infoRow('Nome', data.obra.cliente_nome);
    infoRow('CNPJ/CPF', data.obra.cliente_cpf_cnpj || '—');
    infoRow('E-mail', data.obra.cliente_email || '—');
    infoRow('Telefone', data.obra.cliente_telefone || '—');
    y += 3;
  }

  // PERIOD
  sectionTitle('3. PERÍODO DO RELATÓRIO');
  infoRow('Data Inicial', fmt(data.periodo.inicio));
  infoRow('Data Final', fmt(data.periodo.fim));
  y += 3;

  // DEADLINE CONTROL
  sectionTitle('4. CONTROLE DE PRAZO');
  const prazoData = [
    ['Prazo Contratual (dias úteis)', String(data.prazos.contratual)],
    ['Dias Parados', String(data.prazos.parados)],
    ['Prazo Ajustado', String(data.prazos.ajustado)],
    ['Dias Trabalhados', String(data.prazos.trabalhados)],
    ['Saldo de Prazo', String(data.prazos.saldo)],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: prazoData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: 'striped',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ACTIVITIES - Daily Evolution
  if (data.atividades.length > 0) {
    sectionTitle('5. DESCRIÇÃO DOS SERVIÇOS — EVOLUÇÃO DIÁRIA');

    // Group activities by description, showing daily evolution
    const atividadesByDesc = new Map<string, { diarioData: string; percentual: number; descricao: string }[]>();
    data.diarios.forEach(diario => {
      const diaAtividades = data.atividades.filter(a => a.diario_id === diario.id);
      diaAtividades.forEach(a => {
        const key = a.descricao;
        if (!atividadesByDesc.has(key)) atividadesByDesc.set(key, []);
        atividadesByDesc.get(key)!.push({ diarioData: diario.data, percentual: a.percentual || 0, descricao: a.descricao });
      });
    });

    atividadesByDesc.forEach((entries, desc) => {
      checkPage(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`• ${desc}`, MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');

      const sorted = entries.sort((a, b) => a.diarioData.localeCompare(b.diarioData));
      const rows = sorted.map((entry, idx) => {
        const prevPerc = idx > 0 ? sorted[idx - 1].percentual : 0;
        const evolucao = entry.percentual - prevPerc;
        return [
          fmt(entry.diarioData),
          `${prevPerc}%`,
          `${entry.percentual}%`,
          `${evolucao > 0 ? '+' : ''}${evolucao}%`,
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Data', '% Anterior', '% Atual', 'Evolução']],
        body: rows,
        margin: { left: MARGIN + 5, right: MARGIN },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        theme: 'striped',
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    });
    y += 3;
  }

  // TEAM - Daily
  if (data.equipe.length > 0) {
    sectionTitle('6. EQUIPE POR DIA');

    const diasComEquipe = data.diarios.map(d => ({
      data: d.data,
      equipe: data.equipe.filter(e => e.diario_id === d.id),
    })).filter(d => d.equipe.length > 0);

    if (diasComEquipe.length > 0) {
      const rows: string[][] = [];
      diasComEquipe.forEach(dia => {
        const byFuncao = new Map<string, number>();
        dia.equipe.forEach(e => {
          const key = e.funcao || 'Sem função';
          byFuncao.set(key, (byFuncao.get(key) || 0) + 1);
        });
        const resumo = Array.from(byFuncao.entries()).map(([f, c]) => `${c} ${f}`).join(', ');
        rows.push([fmt(dia.data), String(dia.equipe.length), resumo]);
      });

      checkPage(20);
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Total', 'Composição']],
        body: rows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        theme: 'striped',
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // MATERIALS
  if (data.materiais.length > 0) {
    sectionTitle('7. MATERIAIS UTILIZADOS');
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
    sectionTitle('8. OCORRÊNCIAS');
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
    sectionTitle('9. CRONOGRAMA DA OBRA');
    checkPage(20);

    const statusMap: Record<string, string> = { nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído' };

    autoTable(doc, {
      startY: y,
      head: [['Atividade', 'Início', 'Fim', 'Progresso', 'Status']],
      body: data.cronograma.map(c => [
        c.nome_atividade,
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

    // Simple Gantt bars
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

        // Label
        doc.setFontSize(7);
        doc.text(c.nome_atividade, MARGIN, y + 4.5, { maxWidth: 48 });

        // Background bar
        doc.setFillColor(219, 234, 254);
        doc.roundedRect(barStart, y, barWidth, rowH, 1, 1, 'F');

        // Progress fill
        const fillW = barWidth * (c.percentual_concluido / 100);
        if (fillW > 0) {
          doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
          doc.roundedRect(barStart, y, fillW, rowH, 1, 1, 'F');
        }

        // Percentage text
        doc.setFontSize(6);
        doc.setTextColor(0);
        doc.text(`${c.percentual_concluido}%`, barStart + barWidth + 2, y + 4.5);
        y += rowH + 2;
      });
      y += 4;
    }
  }

  // =========== PHOTO SECTION ===========
  if (data.imagens.length > 0) {
    newPage();
    sectionTitle('10. REGISTRO FOTOGRÁFICO');

    const imgW = (contentW - 8) / 2; // 2 per row with 8mm gap
    const imgH = imgW * 0.75;
    let figNum = 1;

    for (let i = 0; i < data.imagens.length; i += 2) {
      // Check if we need a new page (image + caption)
      checkPage(imgH + 14);

      for (let col = 0; col < 2; col++) {
        const idx = i + col;
        if (idx >= data.imagens.length) break;
        const img = data.imagens[idx];
        const xPos = MARGIN + col * (imgW + 8);

        try {
          const imgDataUrl = await loadImageAsDataUrl(img.url);
          if (imgDataUrl) {
            // Draw border
            doc.setDrawColor(200);
            doc.rect(xPos, y, imgW, imgH);
            doc.addImage(imgDataUrl, 'PNG', xPos + 0.5, y + 0.5, imgW - 1, imgH - 1);
          }
        } catch {
          // Draw placeholder
          doc.setDrawColor(200);
          doc.rect(xPos, y, imgW, imgH);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('Imagem indisponível', xPos + imgW / 2, y + imgH / 2, { align: 'center' });
          doc.setTextColor(0);
        }

        // Caption
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

  // =========== REVISION HISTORY ===========
  if (data.versoes && data.versoes.length > 0) {
    newPage();
    sectionTitle('11. HISTÓRICO DE REVISÕES');
    autoTable(doc, {
      startY: y,
      head: [['Revisão', 'Data', 'Resumo das Alterações']],
      body: data.versoes.map(v => [v.rev, v.data, v.resumo]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [BLUE[0], BLUE[1], BLUE[2]], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========== SIGNATURES ===========
  newPage();
  sectionTitle('12. ASSINATURAS');
  y += 5;

  if (data.assinaturas.length > 0) {
    // Arrange signatures side by side if 2
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

    // Tech sigs on left, client on right
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
      // Reset y for client side or continue below
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE', techSigs.length > 0 ? rightX : leftX, y - (techSigs.length > 0 ? 40 * techSigs.length + 6 : 0));
      
      let clientY = y;
      if (techSigs.length === 0) {
        clientY = y;
        y += 6;
      }

      for (const sig of clientSigs) {
        checkPage(45);
        await renderSigBlock(sig, techSigs.length > 0 ? rightX : leftX);
        y += 40;
      }
    }
  } else {
    // Empty signature blocks
    const blockW = contentW / 2 - 10;

    // Technical
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

    // Client
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

  // Add footers to all pages (single pass, no duplicates)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Cover page (page 1) gets no page number, content pages get numbered
    addFooter(i === 1 ? undefined : i - 1);
  }

  const hoje = new Date();
  const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
  const nomeObra = data.obra.nome.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fileName = `relatorio_${nomeObra}_${dataFormatada}.pdf`;

  downloadPdf(doc, fileName);
}
