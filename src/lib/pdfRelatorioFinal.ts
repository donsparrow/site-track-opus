import jsPDF from 'jspdf';
import { BLUE, MARGIN, loadImageAsDataUrl, setupPDFHelpers, type EmpresaPDFData } from '@/lib/pdfShared';
import { downloadPdf } from '@/lib/pdfDownload';
import { resolveAnexoUrl } from '@/lib/anexoUrl';
import type { RelatorioFinal, RelatorioFinalFoto, SecaoExtra } from '@/features/relatorio-final/types';

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

/** Mede as dimensões naturais de um dataURL (para manter proporção na capa). */
function measureImage(dataUrl: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
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
  const isVistoria = relatorio.tipo_relatorio === 'vistoria_previa';
  const tituloPdf = isVistoria ? 'RELATÓRIO DE VISTORIA PRÉVIA' : 'RELATÓRIO DE VISTORIA PÓS-OBRA';
  const textoHeaderInterno = isVistoria
    ? `Relatório de Vistoria Prévia — Engenheiro Responsável: ${relatorio.responsavel || '—'}`
    : `Relatório Final de Obra — Engenheiro Responsável: ${relatorio.responsavel || '—'}`;

  // ---------- CAPA ----------
  const capa = await loadStorageImage(relatorio.foto_capa_url);
  const templateCapa = await loadStorageImage(relatorio.template_capa_url);
  const hasTemplate = !!templateCapa;
  let y = 54;

  if (templateCapa) {
    // Fundo: template Canva cobrindo toda a página A4
    try {
      doc.addImage(templateCapa, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
    } catch { /* ignore */ }

    // Título do relatório — topo centralizado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text(tituloPdf, pageW / 2, 15, { align: 'center' });

    // Foto de capa: sempre mostra inteira (contain, sem corte), escala controlável
    if (capa) {
      try {
        const areaX = 15;
        const areaY = 40;
        const areaW = 180;
        const areaH = 145;
        const escala = ((relatorio as RelatorioFinal & { foto_capa_escala?: number }).foto_capa_escala ?? 100) / 100;

        // Obter dimensões reais da imagem
        const imgDims = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: areaW, h: areaH });
          img.src = capa;
        });

        const imgRatio = imgDims.w / imgDims.h;

        // Calcular tamanho "contain" (foto inteira sem corte) dentro da área
        let baseW: number, baseH: number;
        if (imgRatio > areaW / areaH) {
          // Foto mais larga que a área: limitar pela largura
          baseW = areaW;
          baseH = areaW / imgRatio;
        } else {
          // Foto mais alta que a área: limitar pela altura
          baseH = areaH;
          baseW = areaH * imgRatio;
        }

        // Aplicar escala do slider
        const drawW = baseW * escala;
        const drawH = baseH * escala;

        // Centralizar na área
        const drawX = areaX + (areaW - drawW) / 2;
        const drawY = areaY + (areaH - drawH) / 2;

        // Desenhar a foto (sem recorte)
        doc.addImage(capa, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');

        // Borda azul ao redor da foto (acompanha o tamanho real)
        doc.setDrawColor(30, 58, 95);
        doc.setLineWidth(0.8);
        doc.rect(drawX - 0.5, drawY - 0.5, drawW + 1, drawH + 1);
        doc.setLineWidth(0.2);

      } catch {
        // Fallback simples
        try {
          doc.addImage(capa, 'JPEG', 15, 40, 180, 84, undefined, 'FAST');
        } catch { /* ignore */ }
      }
    }

    // Identificação do cliente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    const clienteTexto = `CLIENTE: ${relatorio.cliente_nome || ''}${relatorio.endereco ? ' — ' + relatorio.endereco : ''}`;
    const clienteLines = doc.splitTextToSize(clienteTexto, 140) as string[];
    let yCliente = 205;
    clienteLines.forEach((line: string) => {
      doc.text(line, 8, yCliente);
      yCliente += 7;
    });

    // Data de emissão
    doc.setFontSize(11);
    doc.text(`DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 8, yCliente + 4);

    // Data da vistoria/conclusão
    if (relatorio.data_vistoria) {
      doc.text(`DATA DA VISTORIA: ${fmtDate(relatorio.data_vistoria)}`, 8, yCliente + 12);
    }
  } else {
    // Barra superior
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.rect(0, 0, pageW, 45, 'F');
    doc.setFillColor(70, 110, 160);
    doc.rect(0, 45, pageW, 1.5, 'F');

    if (helpers.logoDataUrl) {
      try {
        const boxW = 45;
        const boxH = 28;
        const ratio = helpers.logoNatW && helpers.logoNatH ? helpers.logoNatW / helpers.logoNatH : boxW / boxH;
        let drawW = boxW;
        let drawH = boxW / ratio;
        if (drawH > boxH) {
          drawH = boxH;
          drawW = boxH * ratio;
        }
        doc.addImage(helpers.logoDataUrl, 'PNG', MARGIN + 2, 8, drawW, drawH, undefined, 'FAST');
      } catch { /* ignore */ }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(isVistoria ? 'RELATÓRIO DE VISTORIA PRÉVIA' : 'RELATÓRIO FINAL DE OBRA', pageW - MARGIN, 24, { align: 'right' });
    doc.setFontSize(14);
    doc.setTextColor(220, 225, 235);
    doc.text(doc.splitTextToSize(obraNome, contentW - 50) as string[], pageW - MARGIN, 34, { align: 'right' });

    y = 54;
    if (capa) {
      try {
        const dims = await measureImage(capa);
        const ratio = dims ? dims.w / dims.h : 4 / 3;
        const imgH = Math.min(115, contentW / (ratio || 4 / 3));
        doc.setDrawColor(180);
        doc.rect(MARGIN - 0.5, y - 0.5, contentW + 1, imgH + 1);
        doc.addImage(capa, 'PNG', MARGIN, y, contentW, imgH, undefined, 'FAST');
        y += imgH + 8;
      } catch { /* ignore */ }
    }

    // Faixa de dados
    const BOX_H = 60;
    doc.setFillColor(240, 242, 245);
    doc.roundedRect(MARGIN, y, contentW, BOX_H, 2, 2, 'F');

    const info: [string, string][] = [
      ['Cliente', relatorio.cliente_nome || '—'],
      ['CPF/CNPJ', relatorio.cliente_cpf_cnpj || '—'],
      ['Endereço', relatorio.endereco || '—'],
      ['Responsável', relatorio.responsavel || '—'],
      ['Início', fmtDate(relatorio.data_inicio)],
      ['Conclusão', fmtDate(relatorio.data_conclusao || relatorio.data_fim_prevista)],
    ];
    let ly = y + 10;
    doc.setFontSize(10);
    info.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
      doc.text(`${label}:`, MARGIN + 5, ly);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(value, contentW - 45) as string[];
      doc.text(lines[0] || '', MARGIN + 33, ly);
      ly += 8;
    });

    // Barra inferior
    doc.setFillColor(70, 110, 160);
    doc.rect(0, pageH - 19.5, pageW, 1.5, 'F');
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.rect(0, pageH - 18, pageW, 18, 'F');
    const rodapeCapa = [empresa?.site, empresa?.instagram]
      .map((v) => (v || '').trim())
      .filter(Boolean)
      .join(' | ');
    if (rodapeCapa) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(rodapeCapa, pageW / 2, pageH - 8, { align: 'center' });
    }
    doc.setTextColor(30, 30, 30);
  }

  // ---------- SEÇÕES ----------
  const secoesExtras: SecaoExtra[] = (() => {
    const raw = relatorio.secoes_extras;
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? (parsed as SecaoExtra[]) : [];
    } catch {
      return [];
    }
  })().sort((a, b) => a.ordem - b.ordem);

  const secoesBase: { titulo: string; conteudo: string | null }[] = isVistoria
    ? [
        { titulo: relatorio.titulo_introducao || 'Introdução', conteudo: relatorio.conteudo_introducao },
        ...secoesExtras.map((s) => ({ titulo: s.titulo || 'Seção', conteudo: s.conteudo })),
        { titulo: relatorio.titulo_conclusao || 'Conclusão', conteudo: relatorio.conteudo_conclusao },
      ]
    : [
        { titulo: relatorio.titulo_introducao || 'Introdução', conteudo: relatorio.conteudo_introducao },
        { titulo: relatorio.titulo_garantia || 'Garantia', conteudo: relatorio.conteudo_garantia },
        { titulo: relatorio.titulo_aditivo || 'Aditivos', conteudo: relatorio.conteudo_aditivo },
        { titulo: relatorio.titulo_conclusao || 'Conclusão', conteudo: relatorio.conteudo_conclusao },
      ];

  const secoes = secoesBase.filter((s) => htmlToParagraphs(s.conteudo).length > 0);

  const newPage = () => {
    doc.addPage();
    let ny = helpers.addHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(textoHeaderInterno, MARGIN, ny);
    ny += 6;
    // Restaurar font padrão para o conteúdo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 30, 30);
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
  const grupos: { tipo: string; label: string }[] = isVistoria
    ? Array.from(new Set(fotos.map((f) => f.tipo)))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((tipo) => ({ tipo, label: tipo.toUpperCase() }))
    : [
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
        try { doc.addImage(dataUrl, 'JPEG', MARGIN, y, contentW, imgH, undefined, 'FAST'); } catch { /* ignore */ }
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

  // Rodapé padrão a partir da página 2 (a capa tem barra própria).
  const totalPages = doc.getNumberOfPages();
  // A capa (com template ou com a barra própria do fallback) nunca recebe o rodapé padrão.
  void hasTemplate;
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    helpers.addFooter(i);
  }
  const safe = obraNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-');
  downloadPdf(doc, `relatorio-final-${safe}.pdf`);
}
