import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface RelatorioPDFData {
  empresa: {
    nome_empresa: string;
    cnpj: string;
    telefone: string;
    email: string;
    logo_url: string;
    site: string;
    instagram: string;
  };
  obra: { nome: string; endereco: string; cliente_nome: string; cliente_cpf_cnpj?: string; cliente_email?: string; cliente_telefone?: string };
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
  assinaturas: any[];
  versao?: number;
}

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

export async function gerarRelatorioPDF(data: RelatorioPDFData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  let y = 15;

  const addFooter = () => {
    const footerY = pageH - 12;
    doc.setDrawColor(180);
    doc.line(marginX, footerY - 3, pageW - marginX, footerY - 3);
    doc.setFontSize(8);
    doc.setTextColor(120);
    const footerText = `${data.empresa.site || 'www.engenhariajf.com.br'} | ${data.empresa.instagram || '@engenhariajf'}`;
    doc.text(footerText, pageW / 2, footerY, { align: 'center' });
    doc.setTextColor(0);
  };

  const addHeader = () => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.empresa.nome_empresa || 'Engenharia JF', marginX + (data.empresa.logo_url ? 22 : 0), 22);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${data.empresa.cnpj || ''}  |  Tel: ${data.empresa.telefone || ''}  |  ${data.empresa.email || ''}`, marginX + (data.empresa.logo_url ? 22 : 0), 28);
    doc.setDrawColor(200);
    doc.line(marginX, 32, pageW - marginX, 32);
    return 38;
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) {
      addFooter();
      doc.addPage();
      y = addHeader();
    }
  };

  const sectionTitle = (title: string) => {
    checkPage(15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(title, marginX, y);
    y += 2;
    doc.setDrawColor(30, 58, 95);
    doc.line(marginX, y, marginX + 60, y);
    y += 6;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
  };

  // Header
  y = addHeader();

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE OBRA', pageW / 2, y, { align: 'center' });
  y += 4;
  if (data.versao) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Versão ${data.versao}`, pageW / 2, y, { align: 'center' });
  }
  y += 8;

  // Obra info
  sectionTitle('DADOS DA OBRA');
  const infoLines = [
    `Obra: ${data.obra.nome}`,
    `Endereço: ${data.obra.endereco || '—'}`,
    `Período: ${fmt(data.periodo.inicio)} a ${fmt(data.periodo.fim)}`,
  ];
  infoLines.forEach(l => { doc.text(l, marginX, y); y += 5; });
  y += 4;

  // Client info
  if (data.obra.cliente_nome) {
    sectionTitle('DADOS DO CLIENTE');
    const clientLines = [
      `Nome: ${data.obra.cliente_nome}`,
      `CNPJ/CPF: ${data.obra.cliente_cpf_cnpj || '—'}`,
      `E-mail: ${data.obra.cliente_email || '—'}`,
      `Telefone: ${data.obra.cliente_telefone || '—'}`,
    ];
    clientLines.forEach(l => { doc.text(l, marginX, y); y += 5; });
    y += 4;
  }

  // Prazos
  sectionTitle('CONTROLE DE PRAZO');
  const prazoData = [
    ['Prazo Contratual (dias úteis)', String(data.prazos.contratual)],
    ['Dias Parados', String(data.prazos.parados)],
    ['Prazo Ajustado', String(data.prazos.ajustado)],
    ['Dias Trabalhados', String(data.prazos.trabalhados)],
    ['Saldo de Prazo', String(data.prazos.saldo)],
  ];
  (doc as any).autoTable({
    startY: y,
    head: [['Indicador', 'Valor']],
    body: prazoData,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 95] },
    theme: 'striped',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Equipe
  if (data.equipe.length > 0) {
    sectionTitle('EQUIPE');
    checkPage(20);
    (doc as any).autoTable({
      startY: y,
      head: [['Funcionário', 'Função', 'Horas']],
      body: data.equipe.map(e => [e.nome_funcionario, e.funcao || '—', `${e.horas_trabalhadas}h`]),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Atividades
  if (data.atividades.length > 0) {
    sectionTitle('ATIVIDADES');
    checkPage(20);
    (doc as any).autoTable({
      startY: y,
      head: [['Descrição', 'Status']],
      body: data.atividades.map(a => [a.descricao, a.status]),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Materiais
  if (data.materiais.length > 0) {
    sectionTitle('MATERIAIS UTILIZADOS');
    checkPage(20);
    (doc as any).autoTable({
      startY: y,
      head: [['Material', 'Quantidade', 'Unidade']],
      body: data.materiais.map(m => [m.material, m.quantidade, m.unidade]),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Ocorrências
  if (data.ocorrencias.length > 0) {
    sectionTitle('OCORRÊNCIAS');
    checkPage(20);
    (doc as any).autoTable({
      startY: y,
      head: [['Descrição', 'Impacto']],
      body: data.ocorrencias.map(o => [o.descricao, o.impacto]),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] },
      theme: 'striped',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Imagens
  if (data.imagens.length > 0) {
    sectionTitle('REGISTRO FOTOGRÁFICO');
    for (const img of data.imagens) {
      try {
        checkPage(70);
        const response = await fetch(img.url);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const imgW = 80;
        const imgH = 60;
        doc.addImage(dataUrl, 'JPEG', marginX, y, imgW, imgH);
        if (img.descricao) {
          doc.setFontSize(8);
          doc.text(img.descricao, marginX + imgW + 5, y + 10, { maxWidth: pageW - marginX * 2 - imgW - 5 });
        }
        y += imgH + 5;
      } catch {
        // skip broken images
      }
    }
    y += 4;
  }

  // Assinaturas
  if (data.assinaturas.length > 0) {
    checkPage(60);
    sectionTitle('ASSINATURAS');
    for (const assin of data.assinaturas) {
      checkPage(40);
      try {
        const response = await fetch(assin.assinatura_url);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, 'PNG', marginX, y, 50, 20);
        y += 22;
      } catch {
        y += 5;
      }
      doc.line(marginX, y, marginX + 70, y);
      y += 4;
      doc.setFontSize(9);
      doc.text(assin.nome_assinante, marginX, y);
      y += 4;
      if (assin.cargo) { doc.text(assin.cargo, marginX, y); y += 4; }
      doc.text(`Data: ${fmt(assin.data_assinatura)}`, marginX, y);
      y += 4;
      doc.text(assin.tipo === 'responsavel_tecnico' ? 'Responsável Técnico' : 'Cliente', marginX, y);
      y += 10;
    }
  }

  // Final footer
  addFooter();

  doc.save(`relatorio_${data.obra.nome.replace(/\s+/g, '_')}_v${data.versao || 1}.pdf`);
}
