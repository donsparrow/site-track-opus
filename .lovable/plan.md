# Sincronizar e-mail de login ao editar usuário

## Problema
Editar o e-mail na tela de usuários grava apenas em `profiles`. O e-mail de login (Auth) continua o antigo, gerando divergência entre o exibido e o que funciona no login.

## O que será feito

### 1. Nova edge function `admin-update-email`
Arquivo novo: `supabase/functions/admin-update-email/index.ts`, seguindo o mesmo padrão do `admin-reset-password`:
- CORS + verificação do token do chamador
- Autoriza apenas `admin` e `super_admin`
- Isolamento por `empresa_id` (ignorado para `super_admin`)
- Valida `user_id` e formato de `new_email`
- Executa `adminClient.auth.admin.updateUserById(user_id, { email: new_email })`
- Erros controlados retornam **status 200** com `{ error: "..." }` (padrão já adotado no projeto, para a mensagem chegar ao toast); apenas o `catch` final retorna 500
- E-mail duplicado → "Este e-mail já está em uso por outro usuário."

### 2. `useUsuariosMutations.ts` — mutation `editarUsuario`
- Antes de qualquer update, ler o e-mail atual em `profiles`
- Após o update de `profiles` e antes de `saveVinculoObras`, se o e-mail mudou, invocar `admin-update-email`
- `data?.error` verificado antes de `error` (padrão do arquivo); qualquer erro interrompe a operação
- Nenhum outro comportamento da mutation é alterado

### 3. `EditarUsuarioDialog.tsx`
Nota em âmbar abaixo do campo de e-mail, exibida somente quando o valor diverge do original: "O e-mail de login do usuário também será atualizado."

## Observação
A alteração via `updateUserById` troca o e-mail de login imediatamente, sem e-mail de confirmação. A senha permanece a mesma.

## Fora de escopo
`admin-reset-password`, `admin-delete-user`, `criarUsuario`, demais hooks/componentes e qualquer configuração de banco (RLS, triggers).
