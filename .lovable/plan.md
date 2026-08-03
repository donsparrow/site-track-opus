# Pré-visualização de anexos no Financeiro

Permitir visualizar notas fiscais e boletos direto na tela, sem precisar baixar.

## O que muda

- Novo botão de "olho" (Visualizar) ao lado do botão de download, nos mesmos três pontos onde os anexos aparecem hoje: chips de Nota Fiscal, chips de Boleto e a lista da aba de anexos.
- Ao clicar, abre um modal grande com:
  - PDF renderizado em visualizador embutido (iframe) ocupando a altura da tela.
  - Imagens (JPG/PNG) exibidas ajustadas ao modal, com zoom por clique.
  - Nome do arquivo e o tipo (Nota Fiscal / Boleto) no cabeçalho.
  - Botões "Baixar" e "Abrir em nova aba" dentro do modal.
- Formatos não suportados para preview mostram aviso com opção de download.
- Em telas pequenas o modal ocupa praticamente a tela inteira; se o navegador móvel não renderizar o PDF embutido, aparece o botão "Abrir em nova aba" em destaque.
- O download atual continua funcionando exatamente como está.

## Detalhes técnicos

- Novo componente `src/components/AnexoPreviewDialog.tsx`: recebe caminho do arquivo, nome e tipo; resolve a URL assinada via `resolveAnexoUrl` (bucket privado `anexos`) ao abrir, com estado de carregamento e tratamento de erro.
- Detecção de tipo pela extensão do nome/caminho: `pdf` → iframe; `jpg/jpeg/png/webp` → `<img>`; demais → fallback.
- `src/pages/Financeiro.tsx`: adicionar estado do anexo selecionado, botão de olho nos chips e na lista, e renderizar o dialog. Reaproveita `handleDownload` existente para o botão de baixar dentro do modal.
- Sem alterações de banco, RLS ou lógica financeira.
