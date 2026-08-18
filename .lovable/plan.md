# Correção: Invalidar cache do Cronograma ao atualizar prazo contratual

## Problema
A mutação `atualizarPrazoContratual` em `src/features/diario/hooks/useDiarioMutations.ts` atualiza `obras.prazo_contratual_dias`, mas invalida apenas a query key `['obras-diario']`. O módulo Cronograma observa a mesma obra pela key `['obra-prazo-cronograma', obraId]`, que permanece stale.

## Alteração
No `onSuccess` de `atualizarPrazoContratual`, adicionar a invalidação da query key do Cronograma:

```ts
onSuccess: (dias) => {
  toast.success(`Prazo contratual atualizado: ${dias} dias`);
  qc.invalidateQueries({ queryKey: ['obras-diario'] });
  qc.invalidateQueries({ queryKey: ['obra-prazo-cronograma', obraId] });
},
```

## Escopo
- Arquivo alterado: `src/features/diario/hooks/useDiarioMutations.ts`
- Nenhuma outra mutação, query key, lógica de indicador, componente, rota ou hook do Supabase será modificado.
