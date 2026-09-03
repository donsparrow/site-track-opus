# Módulo Funcionários — Fase 1: Base de dados e navegação (sem telas)

Criar o schema completo do novo módulo interno "Funcionários" (rota `/funcionarios`) para controle de presença e pagamento da equipe, sem vínculo obrigatório com obras. Nenhuma tela nesta fase.

## 1. Nova migração SQL (via ferramenta de migração)

Quatro tabelas seguindo o padrão multi-tenant do projeto (`empresa_id`, trigger `set_empresa_id`, trigger `update_updated_at_column`):

### `funcionarios`
- `nome` (obrigatório), `funcao`, `telefone`, `foto_url`
- `valor_diaria` numeric(10,2) default 0
- `dias_padrao` integer[] default '{1,2,3,4,5,6}' (0=domingo .. 6=sábado)
- `obra_atual_id` → obras(id) ON DELETE SET NULL, e `obra_atual_texto` (obra avulsa, só usado quando `obra_atual_id` for null)
- `ativo` boolean default true
- `empresa_id` NOT NULL → empresas(id) ON DELETE CASCADE
- `created_at`/`updated_at`

### `ponto_registros`
- `funcionario_id` NOT NULL → funcionarios(id) ON DELETE CASCADE
- `data` date NOT NULL
- `status` text CHECK IN ('integral','meio','falta')
- `motivo` text (sem trava no banco)
- `obra_id` → obras(id) ON DELETE SET NULL, `obra_texto` (obra avulsa do dia), `observacao`
- UNIQUE (funcionario_id, data)
- `empresa_id` + triggers padrão

### `funcionario_lancamentos`
- `funcionario_id` NOT NULL → funcionarios(id) ON DELETE CASCADE
- `data` date NOT NULL
- `tipo` text CHECK IN ('vale','adiantamento','desconto','bonus')
- `valor` numeric(10,2) NOT NULL, `descricao` text
- `empresa_id` + `created_at`/`updated_at`

### `funcionario_fechamentos` (histórico congelado da quinzena)
- `funcionario_id` NOT NULL → funcionarios(id) ON DELETE CASCADE
- `empresa_id` NOT NULL → empresas(id) ON DELETE CASCADE
- `periodo_inicio`, `periodo_fim` date NOT NULL
- `valor_diaria_congelado`, `dias_integrais`, `dias_meio`, `total_vales`, `valor_liquido` (numeric, defaults 0)
- `detalhamento_obras` jsonb (array de {obra_id, obra_nome, dias, valor})
- `valor_nao_alocado` numeric(10,2) default 0
- `status` text default 'fechado' CHECK IN ('fechado','reaberto')

## 2. RLS — mais restrito que ferramentas (dado salarial)

Para as 4 tabelas, nesta ordem: CREATE TABLE → GRANT → ENABLE RLS → POLICIES.

- GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated; GRANT ALL TO service_role
- SELECT: `empresa_id = get_user_empresa_id(auth.uid())`
- INSERT/UPDATE/DELETE: `empresa_id = get_user_empresa_id(auth.uid()) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))`
- Trabalhador não recebe acesso de escrita (deliberado — mais restrito que o padrão de ferramentas)

## 3. Permissões (src/hooks/usePermissions.ts)

Apenas adições, sem alterar lógica existente:
- `Modulo` += `'funcionarios'`
- `MODULOS` += `'funcionarios'`
- `MODULO_LABELS` += `funcionarios: 'Funcionários'`
- `ROUTE_MODULE_MAP` += `'/funcionarios': 'funcionarios'`

## 4. Sidebar (AppSidebar.tsx e MobileSidebar.tsx)

Adicionar item sem reordenar os existentes:
```text
{ to: '/funcionarios', label: 'Funcionários', icon: Users, roles: ['admin', 'super_admin'] }
```
O ícone `Users` já é importado em ambos os arquivos.

## Observações técnicas
- `ponto_registros`, `funcionario_lancamentos` e `funcionario_fechamentos` levam `empresa_id` direto (padrão do projeto) para permitir RLS simples por tenant.
- A UNIQUE (funcionario_id, data) garante um registro de ponto por funcionário por dia.
- Nada é alterado em `diario_equipe`, `mao_de_obra` ou componentes do Diário de Obra.
- A migração exigirá aprovação antes de rodar; após aprovada, os types do Supabase são regenerados automaticamente.
- Fase 2 (telas da rota /funcionarios) ficará para um próximo passo; nesta fase a rota ainda não existirá no App.tsx.

## Entrega
Resumo do que foi criado ao final, para revisão antes da Fase 2.
