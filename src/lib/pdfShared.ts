import jsPDF from 'jspdf';

export const BLUE = [30, 58, 95] as const;
export const MARGIN = 15;

export async function loadImageAsDataUrl(url: string): Promise<string | null> {
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

export interface EmpresaPDFData {
  nome_empresa?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  site?: string;
  instagram?: string;
  endereco?: string;
}

export interface PDFHelpers {
  addHeader: () => number;
  addFooter: (pageNum?: number) => void;
  addAllFooters: () => void;
  logoDataUrl: string | null;
  logoNatW: number;
  logoNatH: number;
}

export async function setupPDFHelpers(doc: jsPDF, empresa: EmpresaPDFData | null): Promise<PDFHelpers> {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const emp = empresa || {};
  const hasEmpresa = !!(emp.nome_empresa);
  const siteTxt = emp.site || 'www.engenhariajf.com.br';
  const instaTxt = emp.instagram || '@engenhariajf';

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

  const addAllFooters = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i);
    }
  };

  return { addHeader, addFooter, addAllFooters, logoDataUrl, logoNatW, logoNatH };
}
