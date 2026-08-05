# Auditoria RLS e endurecimento por papel (síndico/cliente)

## Passo 1 — Estado ATUAL (lido diretamente do banco, já considerando todas as migrations aplicadas)

Achado importante: **não existe mais nenhuma política com `USING (true)` ou `WITH CHECK (true)` no schema public**. Todas as tabelas que você citou (clientes, obras, atividades_obra, assinaturas, imagens, mao_de_obra, diario_*) já foram substituídas por DROP+CREATE em migrations anteriores. O risco real hoje é outro: **as políticas de SELECT filtram só por empresa, sem checar papel**.

### Financeiro e custos

| Tabela | Comando | Condição atual | Verifica papel? |
|---|---|---|---|
| despesas | SELECT | `empresa_id = get_user_empresa_id()` | **Não** |
| despesas | INSERT / UPDATE | empresa + (admin OR trabalhador) | Sim |
| despesas | DELETE | empresa + admin | Sim |
| receitas | SELECT | `empresa_id = ...` | **Não** |
| receitas | INSERT / UPDATE | empresa + (admin OR trabalhador) | Sim |
| receitas | DELETE | empresa + admin | Sim |
| parcelas | SELECT | `empresa_id = ...` | **Não** |
| parcelas | INSERT / UPDATE | empresa + (admin OR trabalhador) | Sim |
| parcelas | DELETE | empresa + admin | Sim |
| mao_de_obra | SELECT | `empresa_id = ...` | **Não** |
| mao_de_obra | INSERT / UPDATE | empresa + (admin OR trabalhador) | Sim |
| mao_de_obra | DELETE | *(sem política — bloqueado)* | — |
| financeiro_anexos | SELECT | `empresa_id = ...` | **Não** |
| financeiro_anexos | ALL | empresa + (admin OR trabalhador) | Sim |

Não existe tabela de fornecedores/pagamentos no banco — pagamentos vivem em `parcelas`/`despesas`.

### Ferramentas, compras e materiais

| Tabela | Comando | Condição atual | Verifica papel? |
|---|---|---|---|
| ferramentas | SELECT | `empresa_id = ...` | **Não** |
| ferramentas | ALL | empresa + (admin OR trabalhador) | Sim |
| ferramentas_historico | SELECT | `empresa_id = ...` | **Não** |
| ferramentas_historico | INSERT | empresa + (admin OR trabalhador) | Sim |
| compras_ferramentas | SELECT | `empresa_id = ...` | **Não** |
| compras_ferramentas | INSERT / UPDATE / DELETE | empresa + (admin OR trabalhador) | Sim |
| compras_materiais | SELECT | `empresa_id = ...` | **Não** |
| compras_materiais | INSERT / UPDATE | empresa + (admin OR trabalhador) | Sim |
| manutencao_ferramentas | SELECT | `empresa_id = ...` | **Não** |
| manutencao_ferramentas | INSERT / UPDATE | empresa + (admin OR trabalhador) | Sim |

### Operacional / cadastros (SELECT sem papel e sem vínculo de obra)

| Tabela | SELECT atual | Verifica papel? |
|---|---|---|
| clientes | `empresa_id = ...` | **Não** |
| obras | `can_access_obra(id)` (empresa p/ admin, vínculo p/ demais) | Sim (já correto) |
| atividades_obra | `empresa_id = ...` | **Não** |
| cronograma / cronograma_atividades | empresa (direto / via cronograma) | **Não** |
| diario_obra e diario_* (atividades, equipe, imagens, materiais, ocorrencias, paralisacoes) | empresa (direto / via diario_obra) | **Não** |
| relatorios, relatorio_versoes, relatorio_logs, assinaturas | empresa (direto / via relatorios) | **Não** |
| documentos_pastas / documentos_arquivos | empresa (direto / via pasta) | **Não** |
| imagens | `empresa_id = ...` | **Não** |
| obra_aditivos | empresa OR super_admin | **Não** |
| configuracoes_empresa | `empresa_id = ...` | **Não** (leitura ok p/ todos) |

Já corretas e fora do escopo: profiles, user_roles, permissoes_usuario, usuario_obras, empresas, dashboard_layouts, google_calendar_tokens.

Observação: as políticas atuais quase nunca incluem `super_admin`, que hoje só enxerga via `empresa_id` do próprio perfil. Manterei esse comportamento salvo indicação contrária.

---

## Passo 2 — Matriz de acesso alvo

| Domínio | admin | trabalhador | sindico / cliente |
|---|---|---|---|
| despesas, receitas, parcelas, mao_de_obra, financeiro_anexos | tudo (DELETE só admin) | ler/criar/editar | **nenhum acesso** |
| ferramentas, ferramentas_historico, compras_*, manutencao_ferramentas | tudo | ler/criar/editar | **nenhum acesso** |
| clientes | tudo | ler/criar/editar | **nenhum acesso** |
| obras | empresa inteira | empresa inteira | leitura apenas das obras vinculadas (já é o caso) |
| cronograma / cronograma_atividades / atividades_obra | tudo | ler/criar/editar | leitura só das obras vinculadas |
| relatorios / relatorio_versoes / assinaturas | tudo | ler/criar/editar | leitura só de relatório de obra vinculada **e status assinado** |
| relatorio_logs | leitura empresa | leitura empresa | nenhum |
| diario_obra e diario_* | tudo | ler/criar/editar | leitura só de obras vinculadas (ver decisão abaixo) |
| imagens | tudo | ler/criar/editar | leitura só de obras vinculadas (ver decisão abaixo) |
| documentos_pastas / documentos_arquivos | tudo | ler/criar/editar | **nenhum acesso** (contêm contratos/NFs) |
| configuracoes_empresa | admin gerencia | leitura | leitura (nome/logo da empresa, usado no cabeçalho) |
| obra_aditivos | tudo | criar | leitura de obra vinculada |

Escrita (INSERT/UPDATE/DELETE) em qualquer tabela permanece restrita a admin/trabalhador; síndico e cliente nunca escrevem.

### Decisão que preciso confirmar
Você pediu que síndico/cliente vejam apenas "fotos/ocorrências marcadas como visíveis ao cliente". **Essa coluna não existe hoje** em `diario_imagens`, `diario_ocorrencias` nem `imagens` — verifiquei o schema. Opções:

- **A (recomendada para esta fase):** síndico/cliente leem diário e imagens das obras vinculadas, sem filtro de "interno". Nada de flag nova, nenhuma mudança de tela.
- **B:** adicionar coluna `visivel_cliente boolean default false` em `diario_obra`, `diario_imagens`, `diario_ocorrencias` e `imagens`, e a RLS de síndico/cliente exige `visivel_cliente = true`. Isso exige, depois, uma mudança de UI para marcar o que é visível (fora desta fase, então na prática síndico/cliente veriam nada até isso ser feito).
- **C:** bloquear diário e imagens totalmente para síndico/cliente por enquanto.

## Passo 3 — Migration (após sua confirmação)

Uma única migration, sem tocar em código de aplicação:

1. Criar função auxiliar SECURITY DEFINER `public.is_operacional(_uid uuid)` = `has_role(_uid,'admin') OR has_role(_uid,'trabalhador') OR has_role(_uid,'super_admin')`, para evitar repetição e recursão.
2. `DROP POLICY` + `CREATE POLICY` de SELECT em: despesas, receitas, parcelas, mao_de_obra, financeiro_anexos, ferramentas, ferramentas_historico, compras_ferramentas, compras_materiais, manutencao_ferramentas, clientes, documentos_pastas, documentos_arquivos, relatorio_logs — todas passando a exigir `empresa_id = get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())`.
3. SELECT das tabelas de obra (atividades_obra, cronograma, cronograma_atividades, diario_obra e filhas, relatorios, relatorio_versoes, assinaturas, imagens, obra_aditivos): substituir o filtro puro de empresa por
   `(empresa_da_linha = get_user_empresa_id(auth.uid()) AND is_operacional(auth.uid())) OR can_access_obra(obra_id)` — usando a função `can_access_obra` já existente (SECURITY DEFINER, sem recursão). Em `relatorios` a via síndico/cliente também exige `status = 'assinado'`.
4. Para as tabelas filhas (diario_*, cronograma_atividades, relatorio_versoes, assinaturas) a checagem usa `EXISTS` na tabela pai — nunca na própria tabela protegida.
5. Adicionar DELETE explícito onde hoje falta e é esperado (atividades_obra, compras_materiais, mao_de_obra, manutencao_ferramentas, relatorios): restrito a admin/trabalhador da empresa. Se preferir manter o bloqueio total atual, retiro este item.
6. Rodar o linter de segurança ao final.

## Passo 4 — Como validar (fornecerei os comandos prontos)

1. Criar usuário de teste `sindico.teste@…` no painel de usuários, papel Síndico, vinculado a **uma** obra.
2. Obter um token via API de auth (`/auth/v1/token?grant_type=password`).
3. Com esse token, `curl` no PostgREST para cada tabela:
   - Deve retornar `[]`: `despesas`, `receitas`, `parcelas`, `mao_de_obra`, `ferramentas`, `compras_ferramentas`, `compras_materiais`, `manutencao_ferramentas`, `clientes`, `documentos_arquivos`, `financeiro_anexos`.
   - Deve retornar dados: `obras` (só a vinculada), `cronograma_atividades` dessa obra, `relatorios` assinados dessa obra.
   - `POST`/`PATCH` em qualquer uma delas deve falhar com erro de RLS (401/403).
4. Repetir com um usuário `trabalhador` para confirmar que nada operacional quebrou, e com o admin para confirmar acesso total.

Os comandos `curl` exatos, com o token e as URLs preenchidas, entrego junto da migration.
