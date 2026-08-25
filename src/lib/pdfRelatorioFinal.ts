import jsPDF from 'jspdf';
import { BLUE, MARGIN, loadImageAsDataUrl, setupPDFHelpers, type EmpresaPDFData } from '@/lib/pdfShared';
import { downloadPdf } from '@/lib/pdfDownload';
import { resolveAnexoUrl } from '@/lib/anexoUrl';
import type { RelatorioFinal, RelatorioFinalFoto } from '@/features/relatorio-final/types';

const fmtDate = (v?: string | null) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR') : '—');

/** Converte HTML simples (tiptap) em parágrafos de texto puro. */
export function htmlToParagraphs(html?: string | null): string[] {
  if (!html) return [];
  return html
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|h1|h2|h3|div|li|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

async function loadStorageImage(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const url = await resolveAnexoUrl(path);
  if (!url) return null;
  return loadImageAsDataUrl(url);
}

interface Params {
  relatorio: RelatorioFinal;
  fotos: RelatorioFinalFoto[];
  obraNome: string;
  empresa: EmpresaPDFData | null;
}

export async function gerarPdfRelatorioFinal({ relatorio, fotos, obraNome, empresa }: Params) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const helpers = await setupPDFHelpers(doc, empresa);

  // ---------- CAPA ----------
  const capa = await loadStorageImage(relatorio.foto_capa_url);
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(0, 0, pageW, 70, 'F');

  if (helpers.logoDataUrl) {
    try {
      const boxW = 50;
      const boxH = 30;
      const ratio = helpers.logoNatW && helpers.logoNatH ? helpers.logoNatW / helpers.logoNatH : boxW / boxH;
      let drawW = boxW;
      let drawH = boxW / ratio;
      if (drawH > boxH) {
        drawH = boxH;
        drawW = boxH * ratio;
      }
      doc.addImage(helpers.logoDataUrl, 'PNG', MARGIN + 5, 10, drawW, drawH, undefined, 'FAST');
    } catch { /* ignore */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('RELATÓRIO FINAL DE OBRA', pageW - MARGIN, 46, { align: 'right' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(obraNome, pageW - MARGIN, 56, { align: 'right' });

  let y = 82;
  if (capa) {
    try {
      doc.addImage(capa, 'PNG', MARGIN, y, contentW, 95, undefined, 'FAST');
      y += 103;
    } catch { /* ignore */ }
  }

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  const info: [string, string][] = [
    ['Cliente', relatorio.cliente_nome || '—'],
    ['CPF/CNPJ', relatorio.cliente_cpf_cnpj || '—'],
    ['Endereço', relatorio.endereco || '—'],
    ['Responsável', relatorio.responsavel || '—'],
    ['Início', fmtDate(relatorio.data_inicio)],
    ['Conclusão', fmtDate(relatorio.data_conclusao || relatorio.data_fim_prevista)],
  ];
  info.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(value, contentW - 40) as string[], MARGIN + 34, y);
    y += 8;
  });

  // ---------- SEÇÕES ----------
  const secoes = [
    { titulo: relatorio.titulo_introducao || 'Introdução', conteudo: relatorio.conteudo_introducao },
    { titulo: relatorio.titulo_garantia || 'Garantia', conteudo: relatorio.conteudo_garantia },
    { titulo: relatorio.titulo_aditivo || 'Aditivos', conteudo: relatorio.conteudo_aditivo },
    { titulo: relatorio.titulo_conclusao || 'Conclusão', conteudo: relatorio.conteudo_conclusao },
  ].filter((s) => htmlToParagraphs(s.conteudo).length > 0);

  const newPage = () => {
    doc.addPage();
    let ny = helpers.addHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Relatório Final de Obra — Engenheiro Responsável: ${relatorio.responsavel || '—'}`,
      MARGIN,
      ny,
    );
    doc.setTextColor(30, 30, 30);
    ny += 6;
    return ny + 6;
  };

  if (secoes.length) {
    y = newPage();
    let sec = 0;
    for (const s of secoes) {
      sec += 1;
      if (y > pageH - 45) y = newPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
      doc.text(`${sec}. ${s.titulo.toUpperCase()}`, MARGIN, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 30, 30);
      for (const par of htmlToParagraphs(s.conteudo)) {
        const lines = doc.splitTextToSize(par, contentW) as string[];
        for (const line of lines) {
          if (y > pageH - 25) y = newPage();
          doc.text(line, MARGIN, y);
          y += 5.5;
        }
        y += 2;
      }
      y += 6;
    }

    if (relatorio.link_externo) {
      y += 8;
      if (y > pageH - 30) y = newPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 30, 30);
      doc.text(relatorio.link_externo_label || 'Link de acesso', MARGIN, y);
      y += 6;
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(49, 130, 206);
      const linkLines = doc.splitTextToSize(relatorio.link_externo, contentW) as string[];
      for (const line of linkLines) {
        if (y > pageH - 25) y = newPage();
        doc.text(line, MARGIN, y);
        y += 5.5;
      }
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
    }
  }

  // ---------- FOTOS ----------
  const grupos: { tipo: string; label: string }[] = [
    { tipo: 'pre_obra', label: 'REGISTRO FOTOGRÁFICO — PRÉ-OBRA' },
    { tipo: 'pos_obra', label: 'REGISTRO FOTOGRÁFICO — PÓS-OBRA' },
  ];

  for (const g of grupos) {
    const lista = fotos.filter((f) => f.tipo === g.tipo).sort((a, b) => a.ordem - b.ordem);
    if (!lista.length) continue;

    y = newPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(g.label, MARGIN, y);
    y += 8;
    doc.setTextColor(30, 30, 30);

    let idx = 0;
    for (const foto of lista) {
      idx += 1;
      const imgH = 95;
      if (y + imgH + 14 > pageH - 20) {
        y = newPage();
      }
      const dataUrl = await loadStorageImage(foto.foto_url);
      if (dataUrl) {
        try { doc.addImage(dataUrl, 'PNG', MARGIN, y, contentW, imgH, undefined, 'FAST'); } catch { /* ignore */ }
      } else {
        doc.setDrawColor(200);
        doc.rect(MARGIN, y, contentW, imgH);
      }
      y += imgH + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const legenda = `Foto ${String(idx).padStart(2, '0')}${foto.legenda ? ` — ${foto.legenda}` : ''}`;
      doc.text(doc.splitTextToSize(legenda, contentW) as string[], MARGIN, y);
      y += 10;
    }
  }

  // ---------- ASSINATURAS ----------
  const assEmpresa = await loadStorageImage(relatorio.assinatura_empresa_url);
  const assSindico = await loadStorageImage(relatorio.assinatura_sindico_url);

  if (assEmpresa || assSindico) {
    y = newPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text('ASSINATURAS', MARGIN, y);
    doc.setTextColor(30, 30, 30);
    y += 16;

    const colW = (contentW - 10) / 2;
    const blocos = [
      { img: assEmpresa, nome: relatorio.assinatura_empresa_nome, cargo: relatorio.assinatura_empresa_cargo, data: relatorio.assinatura_empresa_data },
      { img: assSindico, nome: relatorio.assinatura_sindico_nome, cargo: relatorio.assinatura_sindico_cargo, data: relatorio.assinatura_sindico_data },
    ];

    blocos.forEach((b, i) => {
      const x = MARGIN + i * (colW + 10);
      if (b.img) {
        try { doc.addImage(b.img, 'PNG', x + 5, y, colW - 10, 28, undefined, 'FAST'); } catch { /* ignore */ }
      }
      const lineY = y + 32;
      doc.setDrawColor(120);
      doc.line(x, lineY, x + colW, lineY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(b.nome || '—', x + colW / 2, lineY + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (b.cargo) doc.text(b.cargo, x + colW / 2, lineY + 11, { align: 'center' });
      if (b.data) doc.text(fmtDate(b.data), x + colW / 2, lineY + 16, { align: 'center' });
    });
  }

  helpers.addAllFooters();
  const safe = obraNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-');
  downloadPdf(doc, `relatorio-final-${safe}.pdf`);
}
