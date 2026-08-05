# Refatoração de dados — módulo Financeiro (piloto React Query)

Migrar o Financeiro de fetch manual (useEffect + useState + supabase direto) para React Query, criando o padrão que será replicado nos demais módulos. Comportamento visível idêntico; ganhos apenas em cache, loading e organização.

## Fase 1 — Infra e hooks (itens 1 a 4)

### QueryClient (src/App.tsx)
Defaults: `staleTime: 60_000`, `gcTime: 600_000`, `retry: 2`, `refetchOnWindowFocus: true`.

### Estrutura criada

```text
src/features/financeiro/
  types.ts
  utils.ts
  queryKeys.ts
  hooks/useObrasFinanceiro.ts
  hooks/useReceitas.ts
  hooks/useDespesas.ts
  hooks/useParcelas.ts
  hooks/useAnexosFinanceiro.ts
  hooks/useFinanceiroMutations.ts
  components/...
```

### types.ts
Tipos derivados de `src/integrations/supabase/types.ts` (`Tables<'receitas'>`, `Tables<'despesas'>`, `Tables<'parcelas'>`, `Tables<'financeiro_anexos'>`), mais tipos de join (`ReceitaComObra = Tables<'receitas'> & { obras: { nome: string } | null }`, idem despesas, e `ParcelaRecebidaComReceita`). Zero `any`.

### Query keys hierárquicas (queryKeys.ts)
- `['obras-financeiro', empresaId]`
- `['receitas', empresaId, obraId]`
- `['despesas', empresaId, obraId]`
- `['parcelas', receitaId]` (parcelas de uma receita expandida)
- `['parcelas-recebidas', empresaId, obraId]`
- `['financeiro-anexos', empresaId]`

### Hooks de leitura (useQuery)
Mesmos selects, joins, filtros e ordenações de hoje:
- receitas: `*, obras(nome)` ordenado por `created_at desc`, filtro `eq obra_id` ou `in allowedObraIds`
- despesas: `*, obras(nome)` ordenado por `data desc`, mesmo filtro
- parcelas por receita: `*` ordenado por `numero_parcela`
- parcelas recebidas: `*, receitas(descricao, obra_id, obras(nome))`, `status = recebido`, `data_recebimento not null`, ordenado asc, com o mesmo pós-filtro atual no cliente
- anexos: `financeiro_anexos` `*` ordenado por `created_at desc`

Regras: `enabled` condicionado (`!!empresaId`, `!obrasFilterLoading`, `!!receitaId`); `throw error` no `queryFn`; `placeholderData: keepPreviousData` nas queries que dependem do filtro de obra (evita piscar ao trocar filtro).

O escopo de obras permitidas continua vindo de `useObrasFiltered` exatamente como hoje (inclusive o caso "nenhuma obra acessível" retornando listas vazias).

### Hooks de escrita (useFinanceiroMutations.ts)
Uma mutation por operação, com toasts sonner em `onSuccess`/`onError` e `invalidateQueries` das keys afetadas:
- criar/editar/excluir receita (exclusão apaga parcelas antes, como hoje)
- criar/editar/excluir despesa (mantendo integralmente a sincronia com `manutencao_ferramentas` e o log em `ferramentas_historico`)
- editar/excluir parcela
- receber parcela — **update otimista**: `onMutate` marca a parcela como recebida no cache de `['parcelas', receitaId]`, `onError` reverte com o snapshot, `onSettled` invalida
- upload de anexos (storage + insert em `financeiro_anexos`), mantendo o caminho relativo atual

## Fase 2 — Decomposição visual (item 5)

Componentes em `src/features/financeiro/components/`:
- `ResumoFinanceiro` (3 cards de totais)
- `FiltrosFinanceiro` (select de obra)
- `TabelaReceitas` (linhas + expansão de parcelas + ações + anexos inline)
- `TabelaDespesas`
- `AnexosInline` e `AnexoUploadDialog`
- `NotasFiscaisTab` + geração do PDF de notas fiscais
- Dialogs de edição: `EditarReceitaDialog`, `EditarDespesaDialog`, `EditarParcelaDialog`, `ReceberParcelaDialog`, e os `AlertDialog` de exclusão

Movidos para a feature (sem outros consumidores no projeto): `NovaReceitaDialog`, `NovaDespesaDialog`, `ExtratoFinanceiro`. `AnexoPreviewDialog` permanece em `src/components` (genérico).

`utils.ts`: `fmt` (moeda), `tipoLabels`, `statusParcela`, `totalReceitas`/`totalDespesas`/`saldo`.

`Financeiro.tsx` final: < 150 linhas, só composição (hooks + layout + tabs). Nenhuma chamada a `supabase` na página.

## Estados de loading e erro
- Carregamento inicial: `Skeleton` do shadcn nos cards de resumo e nas tabelas.
- Refetch em background: sem indicador; dados antigos permanecem.
- Erro: card com mensagem clara e botão "Tentar novamente" chamando `refetch()`.

## Regras preservadas
- `canEdit` / `role === 'admin'` para ações e colunas, exatamente como hoje.
- `useObrasFiltered` e `usePermissions` intocados.
- Nenhum cálculo, filtro ou permissão alterado. Nenhuma outra página tocada.

## Entrega final
Resumo do que saiu de onde e foi para onde, mais checklist de teste manual (criar/editar/excluir receita, despesa e parcela; receber parcela; anexar/pré-visualizar/baixar NF; filtrar por obra; navegar para outra página e voltar para validar cache).
