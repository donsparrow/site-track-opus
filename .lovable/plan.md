## Diagnóstico (confirmado)
O bucket `anexos` é privado, mas ao salvar a assinatura o código usa `getPublicUrl` (`src/pages/Relatorios.tsx`, linha 549) e grava essa URL pública em `assinaturas.assinatura_url`. URLs públicas de um bucket privado retornam 404 — por isso:
- na aba "Assinaturas" a imagem não carrega;
- no PDF, `loadImageAsPngDataUrl` falha e imprime "assinatura não disponível".

As políticas de leitura do bucket já permitem que usuários da mesma empresa acessem o arquivo via URL assinada.

## Alterações

### 1. `src/lib/logoUrl.ts` (reuso)
Generalizar os helpers existentes (`extractLogoPath` / `resolveLogoUrl`) como utilitários de caminho no bucket `anexos` — ou criar `src/lib/anexoUrl.ts` reexportando a mesma lógica — para uso também nas assinaturas. Eles já convertem URLs públicas/assinadas antigas em caminho relativo, garantindo compatibilidade com registros existentes.

### 2. `src/pages/Relatorios.tsx`
- Ao assinar (`handleSign`): gravar em `assinatura_url` o **caminho relativo** (`assinaturas/<relatorioId>/<timestamp>.png`) em vez da URL pública.
- Aba "Assinaturas": resolver cada `assinatura_url` para URL assinada (1h) em um estado/mapa local e usar esse valor no `<img>`; manter fallback visual quando não resolver.
- Ao montar os dados do PDF (`handleGerarPDF` e `handleDownloadRelatorio`): substituir `assinatura_url` de cada assinatura pela URL assinada antes de passar para o gerador.

### 3. `src/lib/pdfRelatorio.ts`
Nenhuma mudança de lógica necessária — passará a receber URLs assinadas válidas. Manter o texto de fallback atual.

## Compatibilidade
Assinaturas antigas gravadas como URL pública continuam funcionando: o extrator recupera o caminho a partir da URL e assina novamente.

## Fora do escopo
- Sem alterações no layout do PDF nem nas políticas do banco/storage.
