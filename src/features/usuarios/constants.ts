import { MODULOS } from '@/hooks/usePermissions';
import type { Modulo } from '@/hooks/usePermissions';
import type { PermissaoState } from './types';

export const roleLabels: Record<string, string> = {
  super_admin: 'Administrador Geral',
  admin: 'Diretor',
  trabalhador: 'Funcionário',
  sindico: 'Síndico',
  cliente: 'Cliente',
};

export const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  super_admin: 'destructive',
  admin: 'outline',
  trabalhador: 'default',
  sindico: 'secondary',
  cliente: 'secondary',
};

export const roleBadgeClassName: Record<string, string> = {
  admin: 'border-transparent bg-success text-success-foreground hover:bg-success/90',
};

export const DEFAULT_PERMISSIONS: Record<string, Record<Modulo, { v: boolean; c: boolean; e: boolean; x: boolean }>> = {
  super_admin: Object.fromEntries(MODULOS.map(m => [m, { v: true, c: true, e: true, x: true }])) as Record<Modulo, { v: boolean; c: boolean; e: boolean; x: boolean }>,
  admin: Object.fromEntries(MODULOS.map(m => [m, { v: true, c: true, e: true, x: true }])) as Record<Modulo, { v: boolean; c: boolean; e: boolean; x: boolean }>,
  trabalhador: {
    dashboard: { v: true, c: false, e: false, x: false },
    financeiro: { v: false, c: false, e: false, x: false },
    diario_obra: { v: true, c: true, e: false, x: false },
    cronograma: { v: true, c: false, e: false, x: false },
    relatorios: { v: true, c: false, e: false, x: false },
    documentos: { v: true, c: false, e: false, x: false },
    usuarios: { v: false, c: false, e: false, x: false },
    configuracoes: { v: false, c: false, e: false, x: false },
    clientes: { v: false, c: false, e: false, x: false },
    ferramentas: { v: true, c: true, e: false, x: false },
    relatorio_final: { v: true, c: false, e: false, x: false },
    funcionarios: { v: false, c: false, e: false, x: false },
  },
  sindico: {
    dashboard: { v: true, c: false, e: false, x: false },
    financeiro: { v: false, c: false, e: false, x: false },
    diario_obra: { v: true, c: false, e: false, x: false },
    cronograma: { v: true, c: false, e: false, x: false },
    relatorios: { v: true, c: false, e: false, x: false },
    documentos: { v: true, c: false, e: false, x: false },
    usuarios: { v: false, c: false, e: false, x: false },
    configuracoes: { v: false, c: false, e: false, x: false },
    clientes: { v: false, c: false, e: false, x: false },
    ferramentas: { v: false, c: false, e: false, x: false },
    relatorio_final: { v: true, c: false, e: false, x: false },
    funcionarios: { v: false, c: false, e: false, x: false },
  },
  cliente: {
    dashboard: { v: true, c: false, e: false, x: false },
    financeiro: { v: false, c: false, e: false, x: false },
    diario_obra: { v: true, c: false, e: false, x: false },
    cronograma: { v: true, c: false, e: false, x: false },
    relatorios: { v: true, c: false, e: false, x: false },
    documentos: { v: true, c: false, e: false, x: false },
    usuarios: { v: false, c: false, e: false, x: false },
    configuracoes: { v: false, c: false, e: false, x: false },
    clientes: { v: false, c: false, e: false, x: false },
    ferramentas: { v: false, c: false, e: false, x: false },
    relatorio_final: { v: true, c: false, e: false, x: false },
    funcionarios: { v: false, c: false, e: false, x: false },
  },
};

export function getDefaultPermsForRole(role: string): PermissaoState {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['cliente'];
}

export function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export const isFullAccessRole = (role: string) => role === 'super_admin' || role === 'admin';
