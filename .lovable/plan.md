## Problemas confirmados (em `src/pages/Relatorios.tsx`)

**1. Aviso "Não há novos diários para gerar relatório nesta obra."**
Ao clicar em Visualizar, `handleOpenRelatorio` define a obra selecionada. O `useEffect` que observa `selectedObra` só ignora a auto-detecção quando `relatorioId` já está preenchido — mas nesse momento ele ainda é `null` (só é definido depois, dentro de `consolidar()`, com 500 ms de atraso). Resultado: o efeito roda o fluxo de "novo relatório", mostra o aviso e ainda limpa as datas do período (`setPeriodoInicio('')` / `setPeriodoFim('')`) do relatório que está sendo aberto.

**2. Status continua "rascunho"**
- `handleSign` grava a assinatura e cria uma versão com status `assinado`, mas **nunca** atualiza `relatorios.status` — a lista lê o status da tabela `relatorios`, por isso continua "rascunho".
- `handleGerarPDF` só atualiza `status` quando `hasChanges` é verdadeiro. Na primeira geração (revisão 0, snapshot igual ao da última versão salva) não há mudanças, então o PDF é gerado sem gravar `gerado pdf rev01`.

## Correções propostas

**A. Abrir relatório existente sem disparar auto-detecção**
- Adicionar um marcador (`openingRelatorioRef` / estado `isOpeningExisting`) definido em `handleOpenRelatorio` antes de `setSelectedObra`.
- No `useEffect`, executar a auto-detecção de período apenas quando não houver `relatorioId` **e** não estiver abrindo um relatório existente; limpar o marcador depois que a consolidação terminar.
- Em `handleOpenRelatorio`, definir `setRelatorioId(rel.id)` imediatamente (em vez de esperar a consolidação), o que também elimina a dependência do `setTimeout`.
- Manter o aviso somente no caso real: usuário escolhe uma obra ao criar um **novo** relatório e não há diários novos.

**B. Status "assinado" após assinar**
- Em `handleSign`, após inserir a assinatura, atualizar `relatorios.status = 'assinado'` e recarregar a lista (`loadRelatoriosList()`), para que o badge reflita a mudança na hora.

**C. Status "gerado pdf revNN" ao gerar PDF**
- Em `handleGerarPDF`, gravar o status do PDF também quando não houver alterações: manter a revisão atual (sem criar nova versão) mas atualizar `relatorios.status` para `gerado pdf revNN`.
- Precedência: se o relatório já estiver `assinado`, o status permanece `assinado` (assinado é o estado final) — apenas o número de revisão é atualizado.
- Na primeira geração (revisão 0), incrementar para `rev01` para que o status fique coerente com o PDF entregue.

## Detalhes técnicos

- Arquivo único afetado: `src/pages/Relatorios.tsx`. Sem migração de banco — as colunas `status` e `revisao_pdf` de `relatorios` já existem.
- `statusBadge` já trata rótulos iniciados por `gerado pdf`, e o filtro de status da lista continua funcionando.
- Modo somente leitura permanece igual: campos bloqueados, apenas "Gerar PDF" disponível.
