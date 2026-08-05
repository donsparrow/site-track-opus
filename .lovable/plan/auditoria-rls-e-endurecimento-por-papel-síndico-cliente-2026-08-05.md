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

### Decisão confirmada
Opção **A** aprovada: síndico/cliente leem diário e imagens das obras vinculadas, sem flag de "interno". Nenhuma coluna nova, nenhuma mudança de tela.

---

## Verificações solicitadas antes de aplicar

**(a) Colunas de `configuracoes_empresa`** — verificado no banco:
`id, nome_empresa, cnpj, endereco, telefone, email, logo_url, site, instagram, texto_rodape, empresa_id, responsavel_legal, cpf_responsavel_legal, cargo_responsavel_legal, created_at, updated_at`.

Há campos sensíveis: **CNPJ, e-mail, telefone, endereço, responsável legal e CPF do responsável legal**. O PostgREST não faz RLS por coluna, então a solução aprovada é:
- SELECT direto na tabela passa a exigir admin/trabalhador da empresa;
- criar `public.get_empresa_branding()` (SECURITY DEFINER, STABLE) retornando **apenas `nome_empresa` e `logo_url`** da empresa do usuário logado (`get_user_empresa_id(auth.uid())`), com `GRANT EXECUTE TO authenticated`. Assim síndico/cliente continuam vendo logo e nome no cabeçalho e nos PDFs, sem acesso a CNPJ/CPF/contatos.
- Ajuste mínimo de front nesta fase: `src/hooks/useEmpresaLogo.ts` e `src/hooks/useEmpresaNome.ts` passam a chamar a RPC de branding (fallback para a tabela quando a RPC não retornar nada). As telas administrativas (`Configuracoes.tsx`, PDFs de relatório/cronograma) continuam lendo a tabela completa — só admin/trabalhador acessam essas telas.

**(b) RLS habilitado** — verificado: **nenhuma tabela do schema public está sem RLS**. Todas têm `rowsecurity = true`.

**(c) Gate do relatório** — verificado: `relatorios.status` contém hoje `rascunho` (10), `assinado` (2) e `excluido` (2). `assinado` é o gate correto; o filtro `status = 'assinado'` exclui automaticamente rascunhos e soft-deletados.

Aprovado também: função `is_operacional`, uso de `EXISTS` na tabela pai para as tabelas filhas, e a matriz do Passo 2 com a Opção A.

## Passo 3 — Migration

Uma única migration:

1. Criar função auxiliar SECURITY DEFINER `public.is_operacional(_uid uuid)` = `has_role(_uid,'admin') OR has_role(_uid,'trabalhador') OR has_role(_uid,'super_admin')`, para evitar repetição e recursão.
2. Criar `public.get_empresa_branding()` (SECURITY DEFINER, STABLE) → `nome_empresa`, `logo_url` da empresa do usuário logado; `GRANT EXECUTE TO authenticated`.
3. `DROP POLICY` + `CREATE POLICY` de SELECT em: despesas, receitas, parcelas, mao_de_obra, financeiro_anexos, ferramentas, ferramentas_historico, compras_ferramentas, compras_materiais, manutencao_ferramentas, clientes, documentos_pastas, documentos_arquivos, relatorio_logs, configuracoes_empresa — todas passando a exigir `empresa_id = get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())`.
4. SELECT das tabelas de obra (atividades_obra, cronograma, cronograma_atividades, diario_obra e filhas, relatorios, relatorio_versoes, assinaturas, imagens, obra_aditivos): substituir o filtro puro de empresa por
   `(empresa_da_linha = get_user_empresa_id(auth.uid()) AND is_operacional(auth.uid())) OR can_access_obra(obra_id)` — usando `can_access_obra`, já existente e SECURITY DEFINER. Em `relatorios`, `relatorio_versoes` e `assinaturas` a via síndico/cliente exige também `status = 'assinado'`.
5. Tabelas filhas (diario_*, cronograma_atividades, relatorio_versoes, assinaturas): checagem por `EXISTS` na tabela pai — nunca na própria tabela protegida.
6. DELETE explícito onde hoje falta e é esperado (atividades_obra, compras_materiais, mao_de_obra, manutencao_ferramentas, relatorios): restrito a admin/trabalhador da empresa.
7. Rodar o linter de segurança ao final.

Ajuste mínimo de front (só branding): `useEmpresaLogo.ts` e `useEmpresaNome.ts` passam a usar a RPC `get_empresa_branding()`.

## Passo 4 — Validação (eu executo, não só documento)

1. Consultar as políticas resultantes no banco e conferir tabela a tabela contra a matriz do Passo 2.
2. Simular o papel síndico direto no Postgres (`SET LOCAL role authenticated` + `request.jwt.claims` com o `sub` de um usuário síndico vinculado a uma obra) e rodar `SELECT` em cada tabela:
   - esperado vazio: despesas, receitas, parcelas, mao_de_obra, financeiro_anexos, ferramentas, ferramentas_historico, compras_ferramentas, compras_materiais, manutencao_ferramentas, clientes, documentos_pastas, documentos_arquivos, relatorio_logs, configuracoes_empresa;
   - esperado com dados: obras vinculada, cronograma/atividades e diário dessa obra, relatórios `assinado` dessa obra;
   - esperado bloqueado: qualquer INSERT/UPDATE.
3. Repetir a simulação com um usuário `trabalhador` e com o `admin` para provar que nada operacional quebrou.
4. Reportar a tabela de resultados (esperado × obtido) e a saída do linter.

Se não houver hoje um usuário com papel síndico no banco, crio um usuário de teste temporário para a validação e removo ao final.
