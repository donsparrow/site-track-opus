## Causa confirmada

A página de Relatórios (`src/pages/Relatorios.tsx`) **não usa o sistema de permissões modulares**. Ela importa apenas `useAuth` e decide as ações por papel:

- Botão "Novo Relatório" (linha 865): renderizado **sempre**, sem nenhuma condição.
- Botão "Editar" (linha 941): usa `canEdit`, que no `AuthContext` é `role === 'admin' | 'trabalhador' | 'super_admin'` — ignora `permissoes_usuario`.
- Botão "Excluir" (linha 946): usa `isAdmin || isSuperAdmin`.

Confirmei no banco que `espindulasindico@gmail.com` tem, no módulo `relatorios`, apenas visualizar = sim; criar, editar e excluir = não. Portanto o botão aparece porque nada o consulta.

Outras páginas (Clientes, Obras, Dashboard) já usam `usePermissions().pode(...)` — Relatórios ficou de fora.

## Correção proposta

Em `src/pages/Relatorios.tsx`:

1. Passar a usar `usePermissions()` e derivar:
   - `podeCriar = pode('relatorios', 'criar')`
   - `podeEditar = pode('relatorios', 'editar')`
   - `podeExcluir = pode('relatorios', 'excluir')`
   (o hook já concede tudo automaticamente para admin e super admin)
2. Esconder o botão "Novo Relatório" quando `podeCriar` for falso.
3. Trocar a condição do botão "Editar" de `canEdit` para `podeEditar`, e a do "Excluir" para o novo `podeExcluir` baseado em permissão.
4. Na tela de edição, aplicar a mesma regra aos botões de escrita (Salvar / Consolidar / Assinar, linhas ~1107 e ~1112): só aparecem com permissão de editar. Visualizar e Gerar/Baixar PDF continuam disponíveis para quem só tem visualização.
5. Proteção extra: se o usuário sem permissão de criar/editar chegar à tela de edição (por exemplo por estado antigo), forçar modo somente leitura.

## Validação

Entrar como o usuário síndico no preview e confirmar que: a lista aparece, os botões Novo/Editar/Excluir somem, e Visualizar + Download continuam funcionando. Depois confirmar que um admin continua vendo todas as ações.

## Detalhes técnicos

- Arquivo alterado: apenas `src/pages/Relatorios.tsx`.
- Sem alterações de banco de dados nem de regras de acesso (RLS já bloqueia gravação indevida no servidor; esta correção alinha a interface).
