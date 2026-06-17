import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker (uses CDN matching version)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ImportedRow {
  nome_atividade: string;
  data_inicio: string | null;
  data_fim: string | null;
  duracao_dias: number | null;
  observacoes: string | null;
}

// ---------- Helpers ----------

const normalizeKey = (s: string): string =>
  s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const HEADER_MAP: Record<keyof Omit<ImportedRow, never>, string[]> = {
  nome_atividade: ['atividade', 'atividades', 'tarefa', 'tarefas', 'descricao', 'nome', 'servico', 'servicos', 'item', 'task', 'activity'],
  data_inicio: ['inicio', 'datainicio', 'datainicial', 'start', 'startdate', 'comeco', 'dtinicio'],
  data_fim: ['fim', 'termino', 'datafim', 'datafinal', 'end', 'enddate', 'conclusao', 'dtfim'],
  duracao_dias: ['duracao', 'duracaodias', 'dias', 'duration', 'days', 'prazo', 'dur'],
  observacoes: ['observacoes', 'obs', 'observacao', 'notes', 'comentarios', 'comentario'],
};

// Strict token-based header matcher.
// Splits the header into normalized alpha-numeric tokens and matches a candidate
// only when (a) a token equals the candidate, or (b) the whole normalized header
// is short (≤10 chars) and starts with the candidate (so "dur." → "dur" works
// but "inicio06052026en" does NOT match "inicio").
const matchColumn = (header: string): keyof ImportedRow | null => {
  const key = normalizeKey(header);
  if (!key) return null;
  const tokens = header
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  for (const [field, candidates] of Object.entries(HEADER_MAP) as [keyof ImportedRow, string[]][]) {
    for (const c of candidates) {
      if (tokens.includes(c)) return field;
      if (key.length <= 10 && key.startsWith(c) && c.length >= 3) return field;
    }
  }
  return null;
};


// Parse various date formats to ISO yyyy-mm-dd
export const parseDateFlexible = (val: unknown): string | null => {
  if (val == null || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    // Excel serial date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (!s) return null;
  // ISO yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
};

const toNumber = (val: unknown): number | null => {
  if (val == null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
};

// Diff in days, inclusive end? We use exclusive: fim - inicio (calendar days)
export const diffDays = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

// Convert array-of-objects (with arbitrary header keys) into ImportedRow[]
const rowsFromObjects = (raw: Record<string, unknown>[]): ImportedRow[] => {
  if (raw.length === 0) return [];
  const headers = Object.keys(raw[0]);
  const map: Partial<Record<keyof ImportedRow, string>> = {};
  for (const h of headers) {
    const f = matchColumn(h);
    if (f && !map[f]) map[f] = h;
  }
  if (!map.nome_atividade) {
    // Fallback: pick the first text column
    map.nome_atividade = headers[0];
  }
  const out: ImportedRow[] = [];
  for (const r of raw) {
    const nome = (r[map.nome_atividade!] ?? '').toString().trim();
    if (!nome) continue;
    const inicio = map.data_inicio ? parseDateFlexible(r[map.data_inicio]) : null;
    const fim = map.data_fim ? parseDateFlexible(r[map.data_fim]) : null;
    let dur = map.duracao_dias ? toNumber(r[map.duracao_dias]) : null;
    if (dur == null && inicio && fim) dur = diffDays(inicio, fim);
    const obs = map.observacoes ? (r[map.observacoes] ?? '').toString().trim() : '';
    out.push({
      nome_atividade: nome,
      data_inicio: inicio,
      data_fim: fim,
      duracao_dias: dur,
      observacoes: obs || null,
    });
  }
  return out;
};

// Convert array-of-arrays (with first row as headers) into ImportedRow[]
const rowsFromMatrix = (matrix: unknown[][]): ImportedRow[] => {
  if (matrix.length < 2) return [];
  // Find header row (first row with at least one matched column)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(matrix.length, 5); i++) {
    const found = matrix[i].some(c => c && matchColumn(String(c)));
    if (found) { headerIdx = i; break; }
  }
  const headers = matrix[headerIdx].map(h => String(h ?? ''));
  const objs: Record<string, unknown>[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every(c => c == null || c === '')) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h || `col${idx}`] = row[idx]; });
    objs.push(obj);
  }
  return rowsFromObjects(objs);
};

// ---------- CSV ----------
export const parseCSV = async (file: File): Promise<ImportedRow[]> => {
  const text = await file.text();
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });
  if (result.data && result.data.length && Object.keys(result.data[0]).length > 1) {
    return rowsFromObjects(result.data);
  }
  // Fallback: parse as matrix
  const matrix = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
  return rowsFromMatrix(matrix);
};

// ---------- XLSX / XLS ----------
export const parseXLSX = async (file: File): Promise<ImportedRow[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  return rowsFromMatrix(matrix);
};

// ---------- PDF ----------
export const parsePDF = async (file: File): Promise<ImportedRow[]> => {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allLines: { y: number; items: { x: number; str: string }[] }[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    // Group items by Y coordinate (line)
    const linesMap = new Map<number, { x: number; str: string }[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of tc.items as any[]) {
      const str = (item.str || '').toString();
      if (!str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const arr = linesMap.get(y) || [];
      arr.push({ x, str });
      linesMap.set(y, arr);
    }
    for (const [y, items] of linesMap.entries()) {
      items.sort((a, b) => a.x - b.x);
      allLines.push({ y, items });
    }
  }

  // Heuristic: find lines that contain at least one date pattern → treat as activity row
  const DATE_RE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/g;
  const rows: ImportedRow[] = [];
  for (const line of allLines) {
    const fullText = line.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
    const dates = fullText.match(DATE_RE);
    if (!dates || dates.length === 0) continue;
    // Remove dates from text → activity name
    let nome = fullText;
    for (const d of dates) nome = nome.replace(d, '');
    // Remove leading numbering "1." or "1 -"
    nome = nome.replace(/^\s*\d+[\.\)\-]\s*/, '').trim();
    // Try to extract duration as standalone integer at end
    let dur: number | null = null;
    const durMatch = nome.match(/\b(\d{1,4})\s*(dias|d)?\s*$/i);
    if (durMatch) {
      dur = parseInt(durMatch[1]);
      nome = nome.slice(0, durMatch.index).trim();
    }
    nome = nome.replace(/\s{2,}/g, ' ').replace(/[\|\-–—]+\s*$/, '').trim();
    if (!nome) continue;
    const inicio = parseDateFlexible(dates[0]);
    const fim = dates.length > 1 ? parseDateFlexible(dates[1]) : null;
    if (dur == null && inicio && fim) dur = diffDays(inicio, fim);
    rows.push({
      nome_atividade: nome,
      data_inicio: inicio,
      data_fim: fim,
      duracao_dias: dur,
      observacoes: null,
    });
  }
  return rows;
};

// Main dispatcher
export const parseImportFile = async (file: File): Promise<ImportedRow[]> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCSV(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXLSX(file);
  if (name.endsWith('.pdf')) return parsePDF(file);
  throw new Error('Formato não suportado. Use PDF, XLS, XLSX ou CSV.');
};

// Compute end date from start + duration (calendar days)
export const addDaysISO = (startISO: string, days: number): string => {
  const d = new Date(startISO + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
