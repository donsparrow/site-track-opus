import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth: Record<string, unknown> = {};
const perms = { loading: false, pode: (_m: string, _a: string) => true };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => perms }));
import { useAcoesModulo } from './useAcoesModulo';

beforeEach(() => { Object.assign(auth, { role: 'trabalhador', isAdmin: false, isSuperAdmin: false, loading: false }); perms.loading = false; perms.pode = () => true; });

describe('useAcoesModulo', () => {
  it('admin pode tudo', () => {
    auth.role = 'admin'; auth.isAdmin = true; perms.pode = () => false;
    expect(useAcoesModulo('diario_obra')).toMatchObject({ podeCriar: true, podeEditar: true, podeExcluir: true });
  });
  it('trabalhador segue permissoes gravadas', () => {
    perms.pode = (_m, a) => a === 'criar';
    expect(useAcoesModulo('ferramentas')).toMatchObject({ podeCriar: true, podeEditar: false, podeExcluir: false });
  });
  it('sindico e cliente nunca escrevem, mesmo com permissao gravada', () => {
    for (const r of ['sindico', 'cliente']) { auth.role = r; expect(useAcoesModulo('cronograma')).toMatchObject({ podeCriar: false, podeEditar: false, podeExcluir: false }); }
  });
  it('enquanto carrega tudo falso', () => {
    perms.loading = true;
    expect(useAcoesModulo('financeiro')).toMatchObject({ podeCriar: false, podeEditar: false, podeExcluir: false, loading: true });
  });
});
