# Relatório Final: Editor rico e correções no PDF

Melhorias no editor de texto do módulo Relatório Final e correções visuais no PDF gerado.

## 1. Editor de texto rico (src/components/RichTextEditor.tsx)

- Instalar `@tiptap/extension-text-align`.
- Adicionar `TextAlign.configure({ types: ['heading', 'paragraph'] })` às extensões.
- Novos botões na barra de ferramentas, após o botão de link:
  - Alinhar à esquerda, centralizar, alinhar à direita, justificar (ícones AlignLeft/Center/Right/Justify), com estado ativo.
  - Cor do texto: popover com ícone Palette e grade de 8 cores (preto, vermelho, azul, verde, laranja, roxo, rosa, cinza) aplicando `setColor`.
  - Cor de destaque: popover com ícone Highlighter e 6 cores (amarelo, verde, azul, rosa, laranja, roxo) aplicando `toggleHighlight`.

## 2. PDF do Relatório Final (src/lib/pdfRelatorioFinal.ts)

- **Logo da capa**: desenhar proporcionalmente (contain) dentro de um box de 50x30mm usando as dimensões naturais já expostas pelos helpers, posicionado em (MARGIN+5, 10). Sem fundo branco adicional — o PNG mantém a transparência.
- **Nome da obra na capa**: 16pt em negrito, branco, logo abaixo do título, com 2mm de respiro.
- **Link externo**: renderizado após a conclusão, com o rótulo em negrito (ou "Link de acesso" como padrão) e o endereço em azul itálico na linha seguinte.
- **Cabeçalho das páginas internas**: linha adicional em cinza 8pt "Relatório Final de Obra — Engenheiro Responsável: {responsável}" abaixo da faixa azul, com o conteúdo deslocado 6mm para baixo.

## Detalhes técnicos

- `pdfShared.ts` não será alterado: o cabeçalho extra é aplicado apenas no wrapper local de nova página em `pdfRelatorioFinal.ts` (função `newPage`).
- Nenhum outro arquivo é tocado; nenhuma refatoração de componentes existentes.
