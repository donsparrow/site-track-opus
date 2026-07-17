## Objetivo
Usar a logo do J&A GestãoPro (`src/assets/logo-ja-gestaopro.jpeg`) como ícone do "app" instalado no celular, tablet e desktop (PWA + Apple Touch).

## Alterações

1. **Gerar 3 PNGs** a partir da logo existente, com fundo branco (evita fundo transparente/preto no iOS):
   - `public/icons/icon-192x192.png` (192×192)
   - `public/icons/icon-512x512.png` (512×512, usada também como maskable — com padding de segurança para não cortar nas bordas arredondadas do Android)
   - `public/apple-touch-icon.png` (180×180, iOS)

2. **Favicon**: opcionalmente atualizar para a mesma logo (`public/favicon.ico` → gerar novo a partir da logo). Confirme se quer trocar também o favicon do navegador ou manter o atual.

3. **Sem mudanças em código**: `vite.config.ts` e `index.html` já referenciam esses arquivos — só substituir as imagens já resolve.

## Observação importante
Quem já instalou o "app" antes vai continuar vendo o ícone antigo até desinstalar e reinstalar (o sistema operacional cacheia o ícone no momento da instalação). Novos instaladores verão a logo nova imediatamente após o próximo publish.

## Pergunta
Quer que eu troque também o **favicon** do navegador (aba) pela mesma logo, ou mantém o atual?
