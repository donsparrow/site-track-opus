import type { jsPDF } from 'jspdf';

/**
 * Renderiza HTML do Tiptap (RichTextEditor) no jsPDF preservando formatação:
 * negrito, itálico, sublinhado, tachado, cor do texto, marca-texto, links,
 * títulos (H1/H2/H3), listas com marcador e numeradas (com aninhamento)
 * e alinhamento (esquerda, centro, direita, justificado).
 * Texto continua vetorial (selecionável/pesquisável no PDF).
 */

type RGB = [number, number, number];
type Align = 'left' | 'center' | 'right' | 'justify';

interface Estilo {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: RGB | null;
  highlight: RGB | null;
  link: string | null;
}

interface Run {
  text: string; // '\n' = quebra de linha forçada (<br>)
  estilo: Estilo;
}

interface Bloco {
  tipo: 'p' | 'h1' | 'h2' | 'h3';
  align: Align;
  runs: Run[];
  indent: number; // mm
  marcador: string | null;
}

export interface RichTextOptions {
  x: number;
  y: number;
  width: number;
  bottomLimit: number; // y máximo antes de quebrar página
  newPage: () => number; // cria página e retorna o novo y
  fontSize?: number; // pt (padrão 10.5)
  lineHeight?: number; // mm (padrão 5.5)
  paragraphGap?: number; // mm (padrão 2)
  baseColor?: RGB; // padrão [30,30,30]
}

const ESTILO_BASE: Estilo = {
  bold: false, italic: false, underline: false, strike: false,
  color: null, highlight: null, link: null,
};
const COR_LINK: RGB = [49, 130, 206];
const COR_MARCA_TEXTO_PADRAO: RGB = [255, 240, 120];
const PT_TO_MM = 0.3528;
const ESPACOS = /[ \t\n\r\f]+/g; // não inclui &nbsp; ( ), que segue inseparável

function parseCor(valor?: string | null): RGB | null {
  if (!valor) return null;
  const v = valor.trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return m[1].split('').map((c) => parseInt(c + c, 16)) as RGB;
  m = v.match(/^#([0-9a-f]{6})/);
  if (m) {
    const hex = m[1];
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
  }
  m = v.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function lerAlign(el: Element): Align {
  const a = (el as HTMLElement).style?.textAlign || el.getAttribute('align') || '';
  return a === 'center' || a === 'right' || a === 'justify' ? a : 'left';
}

// ---------------------------------------------------------------- PARSER

function coletarInline(node: Node, estilo: Estilo, out: Run[]) {
  if (node.nodeType === 3) {
    const t = (node.textContent || '').replace(ESPACOS, ' ');
    if (t) out.push({ text: t, estilo });
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') { out.push({ text: '\n', estilo }); return; }
  if (tag === 'ul' || tag === 'ol') return; // listas aninhadas tratadas como bloco

  const e: Estilo = { ...estilo };
  if (tag === 'strong' || tag === 'b') e.bold = true;
  if (tag === 'em' || tag === 'i') e.italic = true;
  if (tag === 'u') e.underline = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') e.strike = true;
  if (tag === 'a') {
    e.link = el.getAttribute('href');
    e.underline = true;
    if (!e.color) e.color = COR_LINK;
  }
  if (tag === 'mark') {
    e.highlight = parseCor(el.getAttribute('data-color')) || parseCor(el.style?.backgroundColor) || COR_MARCA_TEXTO_PADRAO;
  }
  const cor = parseCor(el.style?.color);
  if (cor) e.color = cor;
  if (el.style?.fontWeight === 'bold' || Number(el.style?.fontWeight) >= 600) e.bold = true;
  if (el.style?.fontStyle === 'italic') e.italic = true;

  el.childNodes.forEach((c) => coletarInline(c, e, out));
}

function parseBlocos(html: string): Bloco[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const blocos: Bloco[] = [];
  const INDENT = 6;

  const addBloco = (el: Element, tipo: Bloco['tipo'], indent: number, marcador: string | null) => {
    const runs: Run[] = [];
    el.childNodes.forEach((c) => coletarInline(c, ESTILO_BASE, runs));
    blocos.push({ tipo, align: lerAlign(el), runs, indent, marcador });
  };

  const walkLista = (lista: Element, nivel: number) => {
    const ordenada = lista.tagName.toLowerCase() === 'ol';
    let n = Number(lista.getAttribute('start') || 1);
    Array.from(lista.children).forEach((li) => {
      if (li.tagName.toLowerCase() !== 'li') return;
      const marcador = ordenada ? `${n++}.` : nivel % 2 === 0 ? '•' : '-';
      const indent = INDENT * (nivel + 1);
      let primeiro = true;
      const inlineSolto: Node[] = [];
      const flushSolto = () => {
        if (!inlineSolto.length) return;
        const wrap = doc.createElement('p');
        inlineSolto.forEach((nd) => wrap.appendChild(nd.cloneNode(true)));
        addBloco(wrap, 'p', indent, primeiro ? marcador : null);
        primeiro = false;
        inlineSolto.length = 0;
      };
      Array.from(li.childNodes).forEach((c) => {
        const tag = c.nodeType === 1 ? (c as Element).tagName.toLowerCase() : '';
        if (tag === 'ul' || tag === 'ol') { flushSolto(); walkLista(c as Element, nivel + 1); return; }
        if (tag === 'p' || tag === 'div' || /^h[1-6]$/.test(tag)) {
          flushSolto();
          addBloco(c as Element, 'p', indent, primeiro ? marcador : null);
          primeiro = false;
          return;
        }
        inlineSolto.push(c);
      });
      flushSolto();
      if (primeiro) blocos.push({ tipo: 'p', align: 'left', runs: [], indent, marcador });
    });
  };

  const walk = (parent: Element) => {
    const inlineSolto: Node[] = [];
    const flushSolto = () => {
      if (!inlineSolto.length) return;
      const wrap = doc.createElement('p');
      inlineSolto.forEach((nd) => wrap.appendChild(nd.cloneNode(true)));
      if ((wrap.textContent || '').trim()) addBloco(wrap, 'p', 0, null);
      inlineSolto.length = 0;
    };
    Array.from(parent.childNodes).forEach((c) => {
      const tag = c.nodeType === 1 ? (c as Element).tagName.toLowerCase() : '';
      if (tag === 'ul' || tag === 'ol') { flushSolto(); walkLista(c as Element, 0); }
      else if (tag === 'h1' || tag === 'h2' || tag === 'h3') { flushSolto(); addBloco(c as Element, tag, 0, null); }
      else if (/^h[4-6]$/.test(tag)) { flushSolto(); addBloco(c as Element, 'h3', 0, null); }
      else if (tag === 'p') { flushSolto(); addBloco(c as Element, 'p', 0, null); }
      else if (tag === 'div' || tag === 'blockquote' || tag === 'section') { flushSolto(); walk(c as Element); }
      else if (tag === 'hr') { flushSolto(); }
      else inlineSolto.push(c);
    });
    flushSolto();
  };

  walk(doc.body);

  // Remove parágrafos vazios no início e no fim (mantém os do meio como espaçamento)
  const vazio = (b: Bloco) => !b.marcador && !b.runs.some((r) => r.text.trim());
  while (blocos.length && vazio(blocos[0])) blocos.shift();
  while (blocos.length && vazio(blocos[blocos.length - 1])) blocos.pop();
  return blocos;
}

// ---------------------------------------------------------------- LAYOUT

interface Peca { text: string; estilo: Estilo; w: number }
interface Atomo { tipo: 'palavra' | 'espaco' | 'quebra'; pecas: Peca[]; w: number }

function fontStyle(e: Estilo) {
  return e.bold && e.italic ? 'bolditalic' : e.bold ? 'bold' : e.italic ? 'italic' : 'normal';
}

export function renderRichText(doc: jsPDF, html: string | null | undefined, opts: RichTextOptions): number {
  const base = opts.fontSize ?? 10.5;
  const lhBase = opts.lineHeight ?? 5.5;
  const gap = opts.paragraphGap ?? 2;
  const corBase = opts.baseColor ?? [30, 30, 30];
  let y = opts.y;
  if (!html) return y;

  const blocos = parseBlocos(html);

  const medir = (text: string, estilo: Estilo, size: number) => {
    doc.setFont('helvetica', fontStyle(estilo));
    doc.setFontSize(size);
    return doc.getTextWidth(text);
  };

  blocos.forEach((b, idx) => {
    const size = b.tipo === 'h1' ? base + 3 : b.tipo === 'h2' ? base + 2 : b.tipo === 'h3' ? base + 1 : base;
    const lh = lhBase * (size / base);
    const forcarBold = b.tipo !== 'p';
    if (forcarBold && idx > 0) y += 1.5;

    const xIni = opts.x + b.indent;
    const larg = opts.width - b.indent;

    // 1) Runs -> átomos (palavras, espaços, quebras)
    const atomos: Atomo[] = [];
    let atual: Atomo | null = null;
    for (const r of b.runs) {
      const estilo = forcarBold ? { ...r.estilo, bold: true } : r.estilo;
      if (r.text === '\n') { atual = null; atomos.push({ tipo: 'quebra', pecas: [], w: 0 }); continue; }
      for (const parte of r.text.split(/( )/)) {
        if (!parte) continue;
        if (parte === ' ') {
          atual = null;
          atomos.push({ tipo: 'espaco', pecas: [{ text: ' ', estilo, w: medir(' ', estilo, size) }], w: 0 });
          continue;
        }
        if (!atual) { atual = { tipo: 'palavra', pecas: [], w: 0 }; atomos.push(atual); }
        atual.pecas.push({ text: parte, estilo, w: medir(parte, estilo, size) });
      }
    }
    atomos.forEach((a) => { a.w = a.pecas.reduce((s, p) => s + p.w, 0); });

    // Palavra maior que a linha (ex.: URL longa): quebra por caractere
    const atomosOk: Atomo[] = [];
    for (const a of atomos) {
      if (a.tipo !== 'palavra' || a.w <= larg) { atomosOk.push(a); continue; }
      let chunk: Atomo = { tipo: 'palavra', pecas: [], w: 0 };
      for (const p of a.pecas) {
        for (const ch of Array.from(p.text)) {
          const w = medir(ch, p.estilo, size);
          if (chunk.w + w > larg && chunk.w > 0) { atomosOk.push(chunk); chunk = { tipo: 'palavra', pecas: [], w: 0 }; }
          const ult = chunk.pecas[chunk.pecas.length - 1];
          if (ult && ult.estilo === p.estilo) { ult.text += ch; ult.w += w; } else chunk.pecas.push({ text: ch, estilo: p.estilo, w });
          chunk.w += w;
        }
      }
      if (chunk.pecas.length) atomosOk.push(chunk);
    }

    // 2) Quebra de linhas
    const linhas: { atomos: Atomo[]; forcada: boolean }[] = [];
    let linha: Atomo[] = [];
    let wLinha = 0;
    const fechar = (forcada: boolean) => {
      while (linha.length && linha[linha.length - 1].tipo === 'espaco') linha.pop();
      linhas.push({ atomos: linha, forcada });
      linha = []; wLinha = 0;
    };
    for (const a of atomosOk) {
      if (a.tipo === 'quebra') { fechar(true); continue; }
      if (a.tipo === 'espaco' && linha.length === 0) continue;
      if (a.tipo === 'palavra' && wLinha + a.w > larg && linha.length) {
        fechar(false);
      }
      linha.push(a); wLinha += a.w;
    }
    fechar(true);

    // 3) Desenho
    linhas.forEach((ln, li) => {
      if (y > opts.bottomLimit) y = opts.newPage();

      if (li === 0 && b.marcador) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(size);
        doc.setTextColor(corBase[0], corBase[1], corBase[2]);
        doc.text(b.marcador, xIni - 1.5, y, { align: 'right' });
      }

      const natural = ln.atomos.reduce((s, a) => s + a.w, 0);
      const nEspacos = ln.atomos.filter((a) => a.tipo === 'espaco').length;
      const ultimaDoBloco = li === linhas.length - 1 || ln.forcada;
      let x = xIni;
      let extra = 0;
      if (b.align === 'center') x += (larg - natural) / 2;
      else if (b.align === 'right') x += larg - natural;
      else if (b.align === 'justify' && !ultimaDoBloco && nEspacos > 0) extra = (larg - natural) / nEspacos;

      const hTexto = size * PT_TO_MM;
      for (const a of ln.atomos) {
        for (const p of a.pecas) {
          const w = p.w + (a.tipo === 'espaco' ? extra : 0);
          const e = p.estilo;
          const cor = e.color ?? corBase;
          if (e.highlight) {
            doc.setFillColor(e.highlight[0], e.highlight[1], e.highlight[2]);
            doc.rect(x, y - hTexto * 0.8, w, hTexto * 1.05, 'F');
          }
          if (a.tipo !== 'espaco') {
            doc.setFont('helvetica', fontStyle(e));
            doc.setFontSize(size);
            doc.setTextColor(cor[0], cor[1], cor[2]);
            doc.text(p.text, x, y);
          }
          if (e.underline || e.strike) {
            doc.setDrawColor(cor[0], cor[1], cor[2]);
            doc.setLineWidth(0.2);
            if (e.underline) doc.line(x, y + 0.7, x + w, y + 0.7);
            if (e.strike) doc.line(x, y - hTexto * 0.28, x + w, y - hTexto * 0.28);
          }
          if (e.link) doc.link(x, y - hTexto * 0.8, w, hTexto * 1.05, { url: e.link });
          x += w;
        }
      }
      y += lh;
    });

    y += forcarBold ? gap * 0.5 : gap;
  });

  // Restaura estado padrão para quem chamou
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(base);
  doc.setTextColor(corBase[0], corBase[1], corBase[2]);
  doc.setDrawColor(0, 0, 0);
  return y;
}
