# Refatoração do módulo Relatórios (React Query + feature folder)

Replicar em Relatórios o padrão já consolidado em `src/features/financeiro`: pasta de feature, hooks de leitura com React Query, mutations com invalidação, tipos do banco sem `any`, e página final apenas de composição.

Observação de escopo confirmada na leitura do código: a página `src/pages/Relatorios.tsx` (1.319 linhas) **não usa TipTap** — o editor rico existe apenas em Anotações da Obra. O único componente pesado a carregar sob demanda aqui é o `react-signature-canvas` (hoje importado no topo da página).

## Estrutura criada

```text
src/features/relatorios/
  types.ts
  queryKeys.ts
  utils.ts
  hooks/
    useObrasRelatorios.ts     lista de obras do filtro (escopo useObrasFiltered)
    useEmpresaConfig.ts       configuracoes_empresa para cabeçalho/PDF
    useRelatorios.ts          lista por obra/status
    useRelatorioDetail.ts     relatório + assinaturas + dados consolidados
    useRelatorioHistorico.ts  versões e logs (enabled só ao abrir histórico)
    useRelatorioMutations.ts  criar/salvar/publicar/assinar/excluir/registrar PDF
  components/
    RelatoriosLista.tsx, FiltrosRelatorios.tsx
    RelatorioEditor.tsx (abas de dados, prazos, evolução)
    ResumoPrazos.tsx, TabelaDiarios.tsx, GaleriaImagens.tsx
    AssinaturasCard.tsx, AssinarDialog.tsx (canvas lazy)
    HistoricoVersoes.tsx, ConfirmarExclusaoDialog.tsx
    RelatorioSkeleton.tsx, ErroCarregamento.tsx
```

## Query keys

- `['relatorios', empresaId, obraId, status]` — lista
- `['relatorio', relatorioId]` — detalhe (relatório + assinaturas)
- `['relatorio-dados', obraId, inicio, fim, relatorioId]` — consolidação de diários/atividades/imagens
- `['relatorio-versoes', relatorioId]` e `['relatorio-logs', relatorioId]` — só com `enabled` quando o histórico abre
- `['obras-relatorios', empresaId]`, `['empresa-config', empresaId]`

## Hooks de leitura

Mesmos selects, joins, ordenações e filtros de hoje. `carregarDadosRelatorio` de `src/lib/relatorioDados.ts` continua sendo a fonte única de consolidação — passa a ser chamado dentro de um `queryFn` em vez de `useEffect`. `placeholderData: keepPreviousData` nas queries dependentes de filtro, para os dados antigos permanecerem visíveis durante refetch.

O escopo de obras segue vindo de `useObrasFiltered` exatamente como hoje, inclusive o caso "nenhuma obra acessível".

## Mutations

Uma mutation por operação, com toasts sonner e invalidação:

- criar / excluir (soft-delete) → invalida `['relatorios', ...]`
- salvar / publicar / assinar → invalida `['relatorio', relatorioId]`, `['relatorio-versoes', relatorioId]`, `['relatorio-logs', relatorioId]` e a lista
- registrar autoria do PDF (primeiro download por usuário) → invalida logs

A gravação em `relatorio_versoes` e `relatorio_logs` — snapshots JSON, numeração de versão e descrições geradas — é movida sem nenhuma alteração de comportamento.

## PDF

`src/lib/pdfRelatorio.ts` e `pdfShared.ts` não mudam de layout. O gerador continua sem fetch próprio: recebe os dados já carregados pelos hooks (relatório, obra, empresa, diários, imagens, assinaturas). Imagens e assinaturas seguem resolvidas por `resolveAnexoUrl` / `resolveAssinaturas` (URL assinada do bucket privado) antes da geração.

Tanto o download pela listagem quanto pelo editor usam os mesmos hooks, mantendo PDFs idênticos nos dois caminhos.

## Carregamento sob demanda

`react-signature-canvas` passa a ser importado via `React.lazy` dentro de `AssinarDialog`, com `Suspense` e fallback de skeleton — só baixa quando o usuário abre o diálogo de assinatura. O editor de relatório também vira `lazy`, carregando ao entrar no modo edição/visualização.

## Estados

Skeleton no primeiro load (lista e editor), dados antigos visíveis durante refetch em background, e card de erro com botão "Tentar novamente" chamando `refetch()`.

## Preservado sem alteração

Permissões (`canEdit`, `isAdmin`, `usePermissions`), filtro de obras, fluxo de assinatura, regras de publicação e transição de status, cálculo de prazos, e o modo somente leitura. Nenhuma regra de negócio nova.

## Resultado

`src/pages/Relatorios.tsx` abaixo de 150 linhas, sem nenhuma chamada a `supabase`. Entrega final com resumo do que saiu de onde e checklist de teste manual: criar relatório, editar e salvar (nova versão), assinar, publicar, gerar PDF com imagens, conferir histórico de versões e logs, filtrar por obra e status, validar usuário sem permissão de edição.
