# Diário de Obra: separar serviços indisponíveis na seleção

## Descoberta (estado atual verificado)

- Seleção do serviço: `src/features/diario/components/AtividadesTab.tsx`, no `InlineAtividadeForm` (novo lançamento) e no `AtividadeEditRow` (edição) — ambos usam `Select` do shadcn com um `SelectItem` por atividade.
- Lista carregada por `src/features/diario/hooks/useCronogramaAtividades.ts`: busca `cronograma` da obra e depois `cronograma_atividades` filtrado por `cronograma_id`, ordenado por `ordem`. Filtro já é por obra.
- Campo de avanço real: tabela `public.cronograma_atividades`, coluna **`percentual_concluido`** (integer). Já vem no select do hook.
- Atividades já lançadas no diário atual: tabela `diario_atividades`, coluna **`cronograma_atividade_id`**. A lista já está disponível no componente via a prop `atividades` (`diario.diario_atividades`).

Nenhuma mudança de banco, RLS ou migration é necessária.

## O que será feito

### 1. Função pura de classificação
Novo arquivo `src/features/diario/servicoDisponibilidade.ts`:

- `classificarServicos({ atividades, lancadasIds, selecionadoId, permitirRetrabalho })`
- Estados: `disponivel` (`percentual_concluido < 100` e não lançado), `concluido` (`= 100`), `ja_lancado`.
- O `selecionadoId` sempre volta como `disponivel` (regra de edição).
- Ordena: disponíveis primeiro na ordem original, depois indisponíveis.
- Retorna também `totalDisponiveis` e `total` para o contador.

### 2. Componente de seleção reutilizável
Novo `src/features/diario/components/SelecaoServico.tsx`:

- `Select` com `SelectGroup` + `SelectLabel` "Disponíveis" / "Indisponíveis".
- Itens indisponíveis com `disabled` e `text-muted-foreground`, mais badge discreto "100% concluído" ou "Já lançado neste diário".
- Contador acima do campo: "X serviços disponíveis de Y".
- Quando não sobra nenhum disponível: "Todos os serviços desta obra já foram concluídos ou lançados neste diário."
- Classificação em `useMemo`.

### 3. Integração no AtividadesTab
- `AtividadesTab` recebe as atividades já lançadas (já tem) e repassa os `cronograma_atividade_id` para o form.
- `InlineAtividadeForm` e `AtividadeEditRow` passam a usar `SelecaoServico`; o edit row informa o `selecionadoId` para preservar o vínculo atual.

## Fora de escopo

Checkbox de retrabalho (Etapa 5) não será implementado — a função pura já aceita a flag `permitirRetrabalho` para ativação futura sem refatoração.

## Arquivos

- Novo: `src/features/diario/servicoDisponibilidade.ts`
- Novo: `src/features/diario/components/SelecaoServico.tsx`
- Alterado: `src/features/diario/components/AtividadesTab.tsx`

Nenhum outro módulo, nenhum registro histórico e nenhuma regra de salvamento são tocados.
