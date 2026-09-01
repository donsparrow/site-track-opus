# Laudos Técnicos — Fase 2: Vistoria Prévia

Adiciona grupos fotográficos dinâmicos por ambiente e seções de texto extras ao laudo de Vistoria Prévia, refletidos no editor, no visualizador do síndico e no PDF. O fluxo de Entrega de Obra continua idêntico.

## 1. Fotos por ambiente (Vistoria Prévia)

Novo componente `GruposFotosManager.tsx`:
- Botão "Adicionar Ambiente" abre um diálogo com campo de nome (ex.: "Fachada Frontal"). O grupo criado fica em estado local até receber a primeira foto.
- Grupos existentes são derivados dos nomes únicos em `fotos.tipo`, ordenados alfabeticamente, e unidos aos grupos locais recém-criados.
- Cada grupo renderiza o `FotosManager` atual, com título editável inline (Input que ao sair do campo dispara renomear) e todos os handlers de upload, legenda, reordenação e exclusão.

Em `RelatorioFinal.tsx`: quando o tipo for `vistoria_previa`, renderiza `GruposFotosManager`; quando for `entrega_obra`, mantém os dois `FotosManager` fixos (Pré-obra / Pós-obra) exatamente como hoje. O placeholder atual de grupo único "registro" é substituído.

Em `FotosManager.tsx`: aceita um título opcional renderizado como nó customizado (para o Input de renomear), sem alterar o comportamento atual quando recebe uma string.

Em `useRelatorioFinalMutations.ts`: nova mutation `renomearGrupoFotos({ antigoNome, novoNome })` que atualiza `tipo` de todas as fotos do relatório naquele grupo e invalida a query de fotos.

## 2. Seções extras (Vistoria Prévia)

Novo componente `SecoesExtrasEditor`:
- Botão "Adicionar Seção" cria `{ id: crypto.randomUUID(), titulo: 'Nova Seção', conteudo: '', ordem: n }`.
- Cada seção: título editável, editor de texto rico (`RichTextEditor`), setas de reordenar e botão de excluir com confirmação.

Em `RelatorioFinalEditor.tsx`:
- Nova prop `tipoRelatorio`.
- Para `vistoria_previa`, renderiza apenas Introdução (fixa), depois as seções extras ordenadas, depois Conclusão (fixa). Para `entrega_obra`, mantém as quatro seções fixas atuais.
- `secoes_extras` entra no estado do formulário e é enviado no salvar (campo JSONB).

## 3. PDF (`pdfRelatorioFinal.ts`)

- Título da capa dinâmico: "RELATÓRIO DE VISTORIA PRÉVIA" para vistoria, "RELATÓRIO DE VISTORIA PÓS-OBRA" para entrega (aplicado na capa com template e no fallback).
- Cabeçalho das páginas internas passa a usar "Relatório de Vistoria Prévia — Engenheiro Responsável: ..." quando aplicável.
- Seções: para vistoria, a lista renderizada é Introdução + seções extras (ordenadas, ignorando conteúdo vazio) + Conclusão, usando a mesma numeração, quebra de página e renderização de HTML já existentes. Para entrega, a lista fixa permanece inalterada.
- Fotos: para vistoria, os grupos são os valores únicos de `tipo` (nome do ambiente, em maiúsculas como título de seção); para entrega, os grupos fixos pré/pós-obra continuam iguais. A renderização das fotos e legendas não muda.

## 4. Visualizador do síndico (`RelatorioFinalViewer.tsx`)

- Passa a usar a prop `tipoRelatorio` já recebida.
- Seções: para vistoria, mostra Introdução + seções extras (ordenadas, apenas com conteúdo) + Conclusão; para entrega, mantém as seções fixas.
- Fotos: para vistoria, uma galeria por ambiente (agrupada por `tipo`, com URLs assinadas para todas as fotos); para entrega, mantém as galerias pré/pós-obra.
- Título da capa no preview acompanha o tipo do laudo.

## Notas técnicas

- `secoes_extras` já existe como coluna JSONB (`default '[]'`) e `SecaoExtra` já está em `types.ts`; a leitura trata tanto array quanto string JSON.
- Nenhuma migração de banco é necessária nesta fase.
- Não serão alterados: `src/features/relatorios/`, `src/lib/pdfRelatorio.ts`, `src/lib/pdfShared.ts`, `AssinaturasCard.tsx`.
- Verificação final com checagem de tipos.
