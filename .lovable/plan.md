# Refatoração: Cronograma, Usuários, Ferramentas e Documentação

Replicar a arquitetura já usada em `src/features/financeiro` e `src/features/relatorios` (React Query + feature folder) nos quatro módulos restantes. Nenhuma regra de negócio, permissão ou layout muda — apenas onde os dados são buscados e como o cache é atualizado.

Situação atual: Cronograma 899 linhas / 16 chamadas diretas ao backend, Usuários 949 / 24, Ferramentas 684 / 20, Documentação 635 / 20. Ao final, cada página fica apenas com composição, abaixo de 150 linhas, e sem nenhuma chamada direta ao backend.

## Padrão aplicado nos quatro módulos

Cada feature recebe `types.ts`, `queryKeys.ts`, `hooks/` e `components/`:

- Leitura com `useQuery`, chaves hierárquicas por empresa/obra, `placeholderData` para manter os dados antigos visíveis durante o refetch.
- Escrita com `useMutation` e invalidação explícita por prefixo de chave.
- Skeleton apenas no primeiro carregamento; estado de erro com botão "Tentar novamente".
- Tipos derivados dos tipos gerados do banco, sem `any`.

## Cronograma

- `src/features/cronograma/` com hooks de cronograma, atividades e obras.
- `src/components/cronograma/ImportarCronogramaDialog.tsx` movido para `src/features/cronograma/components/`; imports atualizados.
- Exportação de PDF continua igual, mas o gerador passa a receber os dados já carregados pelos hooks, sem buscar nada por conta própria.
- Alteração de percentual/status de atividade com update otimista e rollback em erro.
- Invalidação cruzada: mudanças que afetam o progresso da obra invalidam também as queries de obras e do dashboard.

## Usuários

- `src/features/usuarios/` com hooks de listagem de usuários, perfis/papéis, permissões e vínculo com obras.
- As chamadas às edge functions `admin-delete-user` e `admin-reset-password` viram mutations, com invalidação de `['usuarios']`.
- Permissões por módulo (`permissoes_usuario`) e vínculo usuário-obra (`usuario_obras`) em mutations próprias; ao alterar permissões, o cache do `usePermissions` também é invalidado.
- Nenhuma alteração nas regras de acesso, hierarquia de perfis ou isolamento por empresa.

## Ferramentas

- `src/features/ferramentas/` com hooks de ferramentas, histórico e manutenção.
- O fluxo de manutenção é preservado exatamente: criação em `manutencao_ferramentas`, despesa vinculada por `manutencao_id`, verificação do vínculo, atualização de `ultima_manutencao`/status e registro em `ferramentas_historico`.
- A mutation de manutenção passa a invalidar também as queries do financeiro (`['despesas', ...]`), para a despesa aparecer sem recarregar a página.
- Upload de nota fiscal segue o padrão do bucket de anexos com caminho relativo.

## Documentação

- `src/features/documentacao/` com query de pastas e query de arquivos por pasta, esta com `enabled` condicional (só busca a pasta aberta).
- Upload, download e pré-visualização seguem o padrão atual de URL assinada do bucket privado.

## Detalhes técnicos

- Estrutura por feature idêntica à do financeiro: `queryKeys.ts` com objeto de chaves + objeto de prefixos para invalidação ampla.
- Mutations centralizadas por módulo (`use<Modulo>Mutations.ts`), expondo funções nomeadas em vez de chamadas soltas nos componentes.
- Componentes extraídos por responsabilidade (lista, filtros, diálogos), mantendo o mesmo JSX/estilos de hoje.

## Checklist de teste manual

Cronograma
- Abrir uma obra, ver skeleton no primeiro load e conteúdo preservado ao trocar de filtro.
- Alterar percentual de uma atividade: a barra muda na hora e persiste após reload.
- Exportar o PDF e conferir se o conteúdo é o mesmo de antes.
- Após alterar progresso, conferir a obra e o dashboard atualizados sem reload.

Usuários
- Listar, criar, editar e excluir usuário (edge function) com a lista atualizando sozinha.
- Resetar senha de um usuário.
- Alterar permissões de módulo e conferir o efeito imediato no menu/rotas do usuário.
- Vincular e desvincular obra e conferir a contagem de obras na lista.

Ferramentas
- Cadastrar ferramenta elétrica com voltagem; editar status e conferir o histórico registrado.
- Registrar manutenção com anexo de nota fiscal.

Documentação
- Criar pasta, subir arquivo, pré-visualizar e baixar (usuário admin e usuário dependente).
- Abrir outra pasta e conferir que só os arquivos dela são buscados.

Teste cruzado obrigatório
- Criar uma manutenção em Ferramentas e, sem recarregar a página, abrir Financeiro e conferir a despesa vinculada já listada na obra correspondente.
