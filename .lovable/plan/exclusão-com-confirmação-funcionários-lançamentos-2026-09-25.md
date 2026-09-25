# Exclusão com confirmação — Funcionários / Lançamentos

Somente 2 arquivos: `AdiantamentosPanel.tsx` e `LancamentosTab.tsx`. Nenhuma mudança em hooks, banco ou outros módulos. Reaproveita o `onDelete` existente (mutation `excluir`).

## AdiantamentosPanel.tsx
- Novas props: `canEdit: boolean`, `onDelete: (id: string) => void`.
- Cabeçalho de cada vale/adiantamento: botão lixeira (ghost, icon, destructive) só com `canEdit`; `stopPropagation` + `preventDefault` para não abrir o accordion.
  - Confirmação: se houver descontos vinculados, mensagem "Este vale/adiantamento tem N desconto(s) vinculado(s). Eles não serão excluídos, mas perderão o vínculo com este lançamento."; senão mensagem padrão.
- Cada desconto na lista:
  - Se `descricao === 'Parcela de adiantamento (fechamento)'`: ícone cadeado com tooltip "Gerado automaticamente pelo fechamento de quinzena. Para remover, reabra o fechamento correspondente na aba Fechamentos." — sem lixeira.
  - Senão: lixeira com confirmação simples (só com `canEdit`).
- Um único AlertDialog local (estado: id pendente + mensagem), padrão visual do `ConfirmarExclusaoDialog` do cronograma, botão Excluir destrutivo.

## LancamentosTab.tsx
- Passar `canEdit` e `onDelete` ao painel.
- Lixeira da tabela passa a abrir AlertDialog antes de chamar `onDelete(l.id)`.
- Parcelas de fechamento na tabela: cadeado + mesmo tooltip, sem lixeira.

## Validação
Type-check e prints confirmando: lixeira com confirmação em vales/descontos normais, cadeado nas parcelas de fechamento, confirmação na tabela inferior.
