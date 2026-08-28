# Plano: Adicionar campo "Data da Vistoria" ao Relatório Final

## Objetivo
Permitir que o usuário informe uma data específica de vistoria no Relatório Final, independente da data de conclusão da obra, e exibir essa data na capa do PDF.

## Fase 1 — Banco de dados
- Criar migração SQL para adicionar a coluna `data_vistoria` (tipo `DATE`) na tabela `public.relatorios_finais`.
- Após aprovação e execução da migração, regenerar os tipos do Supabase para refletir a nova coluna no type `RelatorioFinal`.

## Fase 2 — Interface do editor
- No arquivo `src/features/relatorio-final/components/RelatorioFinalEditor.tsx`, no card "Dados do relatório", inserir um novo campo de input do tipo `date`:
  - Label: "Data da vistoria"
  - Campo: `data_vistoria`
  - Posição: imediatamente após o campo "Data de conclusão"
  - Comportamento: editável quando `editable` for true; read-only quando `editable` for false
- O campo será salvo automaticamente pela mutation existente via `onSalvar(form)`.

## Fase 3 — Capa do PDF
- No arquivo `src/lib/pdfRelatorioFinal.ts`, dentro do bloco `if (templateCapa)`:
  - Substituir a condição que exibe `DATA DA VISTORIA` usando `relatorio.data_conclusao` para usar `relatorio.data_vistoria`.
  - O label "DATA DA VISTORIA" só aparecerá quando o campo `data_vistoria` estiver preenchido.

## Arquivos alterados
- Nova migração SQL
- `src/features/relatorio-final/components/RelatorioFinalEditor.tsx`
- `src/lib/pdfRelatorioFinal.ts`

## Não serão alterados
- Lógica da foto de capa, borda, template, escala
- Bloco `else` (fallback) do PDF
- Seções de texto, fotos internas, assinaturas
- Qualquer outro arquivo fora dos listados

## Critérios de aceitação
1. A coluna `data_vistoria` existe no banco de dados.
2. O editor exibe o campo "Data da vistoria" após "Data de conclusão".
3. O campo é salvo corretamente no banco.
4. A capa do PDF exibe "DATA DA VISTORIA" apenas quando o campo está preenchido.
5. A verificação de tipos TypeScript passa sem erros.
