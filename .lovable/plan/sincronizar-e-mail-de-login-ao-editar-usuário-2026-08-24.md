# Sincronizar e-mail de login ao editar usuário

## Problema
Editar o e-mail na tela de usuários grava apenas em `profiles`. O e-mail de login (Auth) continua o antigo, gerando divergência entre o exibido e o que funciona no login.

## O que será feito

### 1. Nova edge function `admin-update-email`
Arquivo novo: `supabase/functions/admin-update-email/index.ts`, no mesmo padrão do `admin-reset-password`:
- CORS + verificação do token do chamador
- Autoriza apenas `admin` e `super_admin`
- Isolamento por `empresa_id` (ignorado para `super_admin`)
- Valida `user_id` e formato básico de `new_email`
- Executa `adminClient.auth.admin.updateUserById(user_id, { email: new_email, email_confirm: true })`
- Erros controlados retornam **status 200** com `{ error: "..." }` (padrão já adotado no projeto, para a mensagem chegar ao toast); apenas o `catch` final retorna 500
- Erro contendo "already" / "duplicate" / "exists" → "Este e-mail já está em uso por outro usuário."; demais erros repassam a mensagem original

### 2. `useUsuariosMutations.ts` — mutation `editarUsuario`
Nova ordem, sem alterar a interface `EditarUsuarioInput`:
1. Ler o e-mail atual em `profiles`
2. Se mudou, invocar `admin-update-email` **antes** de tocar em `profiles` (`data?.error` verificado antes de `error`); falha aborta tudo
3. Atualizar `profiles`
4. Atualizar `user_roles`, vínculos de obra e permissões como já é feito hoje

### 3. `EditarUsuarioDialog.tsx`
- Obter o usuário logado via `useAuth()` (`user`) do `AuthContext`
- Campo de e-mail desabilitado quando `usuario.user_id === user.id`, com nota "Não é possível alterar o próprio e-mail por aqui."
- Para outros usuários, nota em âmbar quando o valor diverge do original: "O e-mail de login do usuário também será atualizado."

## Observação
Com `email_confirm: true` a troca é imediata, sem e-mail de confirmação. A senha permanece a mesma.

## Fora de escopo
`admin-reset-password`, `admin-delete-user`, `criarUsuario`, demais hooks/componentes e qualquer configuração de banco (RLS, triggers).
