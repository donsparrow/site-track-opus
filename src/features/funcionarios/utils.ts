import type { Funcionario, ObraOption, PontoRegistro } from './types';

/** Formata Date em YYYY-MM-DD (local, sem UTC shift). */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Lista de datas (ISO) da quinzena escolhida. */
export function diasDaQuinzena(ano: number, mes: number, quinzena: 1 | 2): string[] {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const inicio = quinzena === 1 ? 1 : 16;
  const fim = quinzena === 1 ? 15 : ultimoDia;
  const out: string[] = [];
  for (let d = inicio; d <= fim; d += 1) out.push(toISODate(new Date(ano, mes, d)));
  return out;
}

/** Sigla de 2 letras para uma obra. */
export function siglaObra(nome: string | null | undefined): string {
  if (!nome) return '--';
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length >= 2) return (palavras[0][0] + palavras[1][0]).toUpperCase();
  return nome.trim().slice(0, 2).toUpperCase();
}

/** Paleta ciclada e estável por obra. */
const PALETA = [
  'bg-sky-600 text-white',
  'bg-emerald-600 text-white',
  'bg-violet-600 text-white',
  'bg-teal-600 text-white',
  'bg-indigo-600 text-white',
];

export function corDaObra(chave: string | null | undefined, obras: ObraOption[]): string {
  if (!chave) return 'bg-slate-500 text-white';
  const idx = obras.findIndex((o) => o.id === chave);
  if (idx >= 0) return PALETA[idx % PALETA.length];
  // obra avulsa (texto livre): hash simples estável
  let h = 0;
  for (let i = 0; i < chave.length; i += 1) h = (h * 31 + chave.charCodeAt(i)) % 997;
  return PALETA[h % PALETA.length];
}

export interface CelulaPonto {
  status: 'integral' | 'meio' | 'falta' | 'na';
  implicito: boolean;
  registro: PontoRegistro | null;
  obraId: string | null;
  obraTexto: string | null;
  motivo: string | null;
}

/** Resolve a célula (registro explícito ou regra implícita pelos dias padrão). */
export function resolverCelula(
  func: Funcionario,
  dataISO: string,
  registro: PontoRegistro | undefined,
): CelulaPonto {
  if (registro) {
    return {
      status: (registro.status as CelulaPonto['status']) || 'integral',
      implicito: false,
      registro,
      obraId: registro.obra_id,
      obraTexto: registro.obra_texto,
      motivo: registro.motivo,
    };
  }
  const diaSemana = parseISODate(dataISO).getDay();
  const padrao = (func.dias_padrao || []).includes(diaSemana);
  return {
    status: padrao ? 'integral' : 'na',
    implicito: true,
    registro: null,
    obraId: padrao ? func.obra_atual_id : null,
    obraTexto: padrao ? func.obra_atual_texto : null,
    motivo: null,
  };
}
