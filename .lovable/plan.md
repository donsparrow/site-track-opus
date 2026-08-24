# Correção: reset de senha bloqueado para super_admin

## Problema
A função de redefinição de senha (`supabase/functions/admin-reset-password/index.ts`) só autoriza o papel `admin`. O Admin Geral (`super_admin`) recebe 403 ao tentar redefinir senhas. Além disso, a checagem de mesma empresa impede o super_admin de atender usuários de outros tenants — o que é justamente a função dele.

## Alterações (apenas neste arquivo)
1. Autorização: aceitar `admin` **e** `super_admin` na verificação de papel.
2. Isolamento de empresa: manter obrigatório para `admin`; ignorar quando o chamador for `super_admin`.

Nada mais muda: validação de token, tamanho mínimo de senha (6), bloqueio de auto-alteração indevida e respostas de erro permanecem iguais. Nenhum hook, componente, rota ou configuração é tocado.

## Detalhes técnicos
- Linha ~48: `if (!roleData || !["admin", "super_admin"].includes(roleData.role))`
- Linhas ~72-83: envolver o bloco de comparação de `empresa_id` em `if (roleData.role !== "super_admin") { ... }`
- Redeploy da edge function após a edição.

## Validação
- Super admin redefine senha de usuário de outra empresa: sucesso.
- Admin comum redefine senha de usuário da própria empresa: sucesso.
- Admin comum tenta usuário de outra empresa: 403 "Usuário não pertence à sua empresa".
