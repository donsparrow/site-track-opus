# Relatório Final: legenda sem lag e nova capa do PDF

## 1. Legenda das fotos sem travamento (FotosManager.tsx)

Hoje cada tecla digitada na legenda dispara um update no banco. Vamos:

- Criar o subcomponente `FotoLegendaInput` no próprio arquivo, com estado local do texto.
- Digitação altera apenas o estado local; o salvamento acontece no `onBlur`, e somente se o valor mudou.
- Sincronizar com a prop `foto.legenda` via `useEffect` apenas quando o campo não está em foco (ref de foco).
- Substituir o `<Input>` atual pelo novo componente; importar `useState`/`useEffect` junto com `useRef`.

## 2. Nova capa do PDF (pdfRelatorioFinal.ts)

Substituir todo o bloco da capa por um layout institucional:

- Faixa azul-marinho do topo (0–45mm) com filete azul claro de 1,5mm.
- Logo com ajuste proporcional (contain) em caixa 45x28mm, em `MARGIN + 2, 8`.
- Título "RELATÓRIO FINAL DE OBRA" (bold 20pt, branco) e nome da obra (bold 14pt, cinza-claro) alinhados à direita.
- Foto de capa centralizada a partir de 54mm, largura total do conteúdo, altura proporcional limitada a 115mm, com borda cinza fina. Sem foto, os dados sobem para 54mm.
- Faixa de dados em retângulo arredondado cinza claro (60mm de altura) com rótulos em azul-marinho bold e valores em preto: Cliente, CPF/CNPJ, Endereço, Responsável, Início, Conclusão.
- Barra azul inferior (18mm) com filete claro e site/instagram da empresa centralizados em branco 8pt.
- Rodapé padrão deixa de ser aplicado na capa: em vez de `helpers.addAllFooters()`, um laço manual a partir da página 2 usando `helpers.addFooter(i)`.

## Detalhes técnicos

- A altura proporcional da foto de capa exige as dimensões naturais da imagem: mediremos o `dataURL` com um `Image()` local dentro de `pdfRelatorioFinal.ts` (fallback 4:3 se falhar), sem tocar em `pdfShared.ts`.
- Site/Instagram vêm do objeto `empresa` já recebido por `gerarPdfRelatorioFinal`.
- Nenhum outro arquivo é alterado; seções, fotos, assinaturas e link externo permanecem como estão.
