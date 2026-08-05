# Refatoração do Diário de Obra (React Query + feature folder)

Mesmo padrão já aplicado em `src/features/financeiro` e `src/features/relatorios`. Comportamento visível e regras de negócio idênticos; ganho em cache, organização e tamanho da página.

Hoje `src/pages/DiarioObra.tsx` tem 1.309 linhas e ~44 chamadas diretas ao Supabase, com estado manual (`useState` + `fetchDiarioDetails`) para diário, equipe, atividades, materiais, ocorrências, paralisações e imagens.

## Estrutura criada

```text
src/features/diario/
  types.ts
  queryKeys.ts
  utils.ts
  hooks/
    useObrasDiario.ts
    useDiarios.ts
    useDiarioDetail.ts
    useCronogramaAtividades.ts
    useDiarioMutations.ts
  components/
    ListaDiarios.tsx
    PrazoContratualCard.tsx
    NovoDiarioDialog.tsx
    CabecalhoDiario.tsx        (modo edição global do header)
    AtividadesTab.tsx          (inclui o slider de percentual)
    EquipeTab.tsx
    MateriaisTab.tsx
    OcorrenciasTab.tsx
    ParalisacoesTab.tsx
    GaleriaImagens.tsx
    DiarioSkeleton.tsx
    ErroCarregamento.tsx
```

## Dados

- `types.ts`: tipos derivados de `Tables<'diario_obra'>`, `Tables<'diario_atividades'>`, etc., mais `DiarioDetalhado` (diário + sub-entidades) e `ObraDiario`. Zero `any`.
- `queryKeys.ts`: `['obras-diario', empresaId]`, `['diarios', obraId]`, `['diario', diarioId]`, `['cronograma-atividades', obraId]`.
- `useDiarios(obraId)`: lista ordenada por data desc, `enabled: !!obraId && !obrasFilterLoading`, `placeholderData: keepPreviousData`.
- `useDiarioDetail(diarioId)`: **uma única query** com select aninhado (`*, diario_atividades(*), diario_equipe(*), diario_materiais(*), diario_ocorrencias(*), diario_paralisacoes(*), diario_imagens(*)`), imagens ordenadas por `created_at` e resolvidas com `resolveAnexoUrl` dentro do `queryFn`.
- `useObrasDiario` continua usando `useObrasFiltered` para o escopo de obras, como hoje.

## Mutations (`useDiarioMutations`)

Uma mutation por operação, toasts em `onSuccess`/`onError`:

- Diário: criar (com a herança do último diário — equipe e atividades — preservada integralmente), editar header, excluir (apagando as 6 sub-tabelas antes, como hoje) → invalidam `['diarios', obraId]`.
- Sub-entidades (equipe, atividades, materiais, ocorrências, paralisações, imagens): criar/editar/excluir → invalidam **apenas** `['diario', diarioId]`.
- Atividades: mantêm `percentualToStatus`, o vínculo com `cronograma_atividade_id` e o `syncCronogramaProgresso` (que também invalida `['cronograma-atividades', obraId]`).
- Prazo contratual da obra: mutation própria no `onBlur`, invalidando as obras.
- Upload de imagens: bucket `anexos`, caminho `diarios/<diarioId>/<timestamp>.<ext>`, grava o caminho relativo, com estado de progresso por arquivo e invalidação de `['diario', diarioId]` ao concluir.

### Slider de percentual

`AtividadesTab` mantém o valor local durante o arraste, aplica **update otimista** no cache de `['diario', diarioId]` e grava com **debounce de 500ms** (`onMutate` guarda snapshot, `onError` reverte, `onSettled` invalida). Sem uma mutation por pixel arrastado.

## Estados

- Primeiro load: `Skeleton` na lista de registros e no painel de detalhe.
- Refetch em background: dados antigos continuam visíveis.
- Erro: card com mensagem e botão "Tentar novamente" (`refetch()`), igual ao financeiro.

## Preservado sem alteração

`percentualToStatus`, `mapLegacyStatus` (`'executado'` → `'concluido'`), labels de clima/status, herança do diário anterior, numeração cronológica das fotos, `useObrasFiltered`, permissões (`canEdit`/`isAdmin`) e o comportamento de seleção de obra/diário.

## Página final

`src/pages/DiarioObra.tsx` fica com **menos de 150 linhas**, só composição (select de obra, prazo, lista, detalhe em abas, dialogs). Nenhuma chamada a `supabase` na página.

## Entrega

Resumo do que saiu de onde e checklist de teste manual: criar diário completo (equipe, atividade vinculada ao cronograma, material, ocorrência, paralisação), editar header em modo edição, arrastar o slider de percentual, subir fotos e conferir miniaturas, excluir sub-itens e excluir o diário.
