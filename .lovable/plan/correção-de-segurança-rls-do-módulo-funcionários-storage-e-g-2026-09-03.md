# Correção de segurança — RLS do módulo Funcionários, Storage e grants de funções

## Objetivo
Aplicar uma única migration no banco de dados para corrigir 5 alertas Critical e 2 Warning do security review, sem alterar nenhum arquivo em `src/`.

## Alterações no banco de dados

Criar migration em `supabase/migrations/` com o conteúdo exato fornecido:

1. **RLS de leitura do módulo Funcionários**
   - `funcionarios`: SELECT permitido para qualquer usuário operacional (`admin`, `super_admin`, `trabalhador`) da mesma empresa.
   - `ponto_registros`, `funcionario_lancamentos`, `funcionario_fechamentos`: SELECT permitido apenas para `admin` e `super_admin` da mesma empresa.
   - Policies de INSERT/UPDATE/DELETE permanecem inalteradas.

2. **Restrição no Storage via `can_read_anexo`**
   - A cláusula solta que permitia leitura de qualquer arquivo em `empresa/<id>/%` é restrita a `empresa/<id>/logo.%` para usuários não operacionais (`sindico`/`cliente`).
   - Todas as outras regras da função permanecem idênticas.

3. **Revogação de grants expostos**
   - Remover `EXECUTE` de `PUBLIC` e `anon` nas funções SECURITY DEFINER:
     - `public.can_read_anexo(text)`
     - `public.get_empresa_branding()`
     - `public.get_empresa_branding(uuid)`
   - Manter `GRANT EXECUTE TO authenticated` em todas.

## Execução

1. Criar a migration com o SQL fornecido.
2. Aplicar via ferramenta de migração do Lovable Cloud.
3. Confirmar aplicação sem erros.

## Entrega

- Nome do arquivo de migration criado.
- Confirmação de que a migration foi aplicada com sucesso.
- Nenhum arquivo em `src/` será modificado.
