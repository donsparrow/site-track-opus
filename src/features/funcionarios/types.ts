export interface Funcionario {
  id: string;
  empresa_id: string;
  nome: string;
  funcao: string | null;
  telefone: string | null;
  foto_url: string | null;
  valor_diaria: number;
  dias_padrao: number[];
  obra_atual_id: string | null;
  obra_atual_texto: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FuncionarioFormValues {
  nome: string;
  funcao: string;
  telefone: string;
  valor_diaria: number;
  dias_padrao: number[];
  obra_atual_id: string | null;
  obra_atual_texto: string;
  ativo: boolean;
  fotoFile?: File | null;
}

export type PontoStatus = 'integral' | 'meio' | 'falta';

export interface PontoRegistro {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  data: string;
  status: string;
  motivo: string | null;
  obra_id: string | null;
  obra_texto: string | null;
  observacao: string | null;
}

export type LancamentoTipo = 'vale' | 'adiantamento' | 'desconto' | 'bonus';

export interface Lancamento {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  data: string;
  tipo: string;
  valor: number;
  descricao: string | null;
}

export interface ObraOption {
  id: string;
  nome: string;
  status: string;
}

export const DIAS_SEMANA = [
  { valor: 0, label: 'Dom', full: 'Domingo' },
  { valor: 1, label: 'Seg', full: 'Segunda' },
  { valor: 2, label: 'Ter', full: 'Terça' },
  { valor: 3, label: 'Qua', full: 'Quarta' },
  { valor: 4, label: 'Qui', full: 'Quinta' },
  { valor: 5, label: 'Sex', full: 'Sexta' },
  { valor: 6, label: 'Sáb', full: 'Sábado' },
];

export const MOTIVOS = ['doença', 'folga', 'chuva', 'injustificada', 'outro'];

export const TIPOS_LANCAMENTO: { valor: LancamentoTipo; label: string; sinal: -1 | 1 }[] = [
  { valor: 'vale', label: 'Vale', sinal: -1 },
  { valor: 'adiantamento', label: 'Adiantamento', sinal: -1 },
  { valor: 'desconto', label: 'Desconto', sinal: -1 },
  { valor: 'bonus', label: 'Bônus', sinal: 1 },
];
