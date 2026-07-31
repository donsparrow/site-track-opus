# Correção das fotos do Diário de Obra

## Problema confirmado

As fotos do diário são enviadas para o bucket privado `anexos`, mas o código salva a URL usando `getPublicUrl` (URL pública). Como o bucket é privado, essa URL retorna erro e a miniatura aparece quebrada — exatamente o que a captura mostra.

O mesmo valor é usado na geração do PDF do relatório, então as fotos também **não** apareceriam no relatório.

O restante do sistema (logo, assinaturas, documentação) já usa URLs assinadas — o diário ficou de fora.

## O que será feito

1. **Upload**: passar a gravar o caminho relativo do arquivo (`diarios/<id>/<arquivo>`) em vez de uma URL pública.
2. **Miniaturas**: ao carregar as imagens do diário, resolver cada valor em URL assinada temporária antes de exibir. Funciona tanto para fotos novas quanto para as já cadastradas (URLs públicas antigas são convertidas de volta em caminho).
3. **Preview antes de enviar**: mantém o comportamento atual.
4. **PDF do relatório**: resolver a URL assinada de cada foto antes de embutir no documento, com fallback silencioso caso alguma imagem falhe (o relatório continua sendo gerado).

## Detalhes técnicos

- Reutilizar `resolveAnexoUrl` / `extractAnexoPath` de `src/lib/anexoUrl.ts` (já tratam caminho relativo, URL pública e URL assinada).
- `src/pages/DiarioObra.tsx`: em `handleUploadImagem` gravar `filePath`; em `fetchDiarioDetails` mapear as imagens resolvendo `url` para URL assinada (1h).
- `src/lib/pdfRelatorio.ts` (linha ~827): resolver `img.url` via `resolveAnexoUrl` antes do `loadImageAsDataUrl`.
- Sem alteração de banco de dados; registros antigos continuam funcionando pela extração do caminho.

## Verificação

Abrir um diário com foto no preview e confirmar que a miniatura renderiza, e gerar um PDF de relatório com esse diário para confirmar que a foto aparece.
