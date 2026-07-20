## Problema

O bucket `anexos` foi tornado **privado** (correção de segurança anterior). O upload da logo em Configurações continua salvando a **URL pública** (`getPublicUrl`) no campo `logo_url`, mas essa URL retorna 404 num bucket privado — por isso a miniatura aparece quebrada mesmo após o toast "Logo enviada!".

O mesmo problema afeta qualquer lugar que renderiza `logo_url` diretamente: sidebar (`useEmpresaLogo`) e cabeçalhos de PDF (`pdfShared.ts`, `pdfRelatorio.ts`, `pdfDashboard.ts`).

## Solução

Passar a armazenar o **caminho relativo** do arquivo (ex.: `empresa/<id>/logo.png`) em `logo_url` e gerar **signed URL** sob demanda para exibição, seguindo o mesmo padrão já usado em `Documentacao.tsx`.

### Mudanças

1. **`src/pages/Configuracoes.tsx`**
   - No `handleLogoUpload`: após upload, salvar apenas o `filePath` em `form.logo_url` (não mais `getPublicUrl`).
   - Estado adicional `logoPreviewUrl` gerado via `createSignedUrl(filePath, 3600)` para o `<img>` de preview (tanto após upload quanto ao carregar config existente que já tenha caminho salvo).
   - Suportar retrocompatibilidade: se `logo_url` já for uma URL http completa antiga, extrair o path com helper (mesmo `extractStoragePath` de Documentacao).

2. **`src/hooks/useEmpresaLogo.ts`**
   - Após buscar `logo_url`, se for path relativo gerar signed URL; se for URL http antiga, extrair path e gerar signed URL. Retornar a URL assinada.

3. **PDFs (`src/lib/pdfShared.ts` e chamadores)**
   - Onde a logo é convertida para dataURL para o cabeçalho, receber signed URL em vez da public URL. Ajustar o ponto único que resolve a logo antes de fazer `fetch` → base64.

### Fora de escopo

- Não mexer nas policies do bucket (mantém privado).
- Não migrar registros antigos no banco — o helper de compatibilidade cobre.

## Arquivos alterados

- `src/pages/Configuracoes.tsx`
- `src/hooks/useEmpresaLogo.ts`
- `src/lib/pdfShared.ts` (e, se necessário, os pontos em `pdfRelatorio.ts` / `pdfDashboard.ts` que passam a logo)
