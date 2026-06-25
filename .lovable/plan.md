
# Suporte PWA — GestãoPro

## Observação importante

Você pediu para criar um `public/sw.js` à mão e registrá-lo no `main.tsx`. Por segurança no preview do Lovable (que já tivemos problema com tela branca/cache neste projeto), vou usar a abordagem oficial recomendada: **`vite-plugin-pwa` com `generateSW`** e um **wrapper de registro com guardas** para nunca registrar SW no preview/iframe/dev. O resultado é equivalente (manifest + service worker offline + instalável Android/iOS), mas sem o risco de "service worker preso" servindo HTML velho.

Nada de lógica de negócio será alterado.

---

## 1. Dependências

- Adicionar `vite-plugin-pwa` (devDependency).

## 2. `vite.config.ts`

- Plugar `VitePWA` com:
  - `registerType: "autoUpdate"`
  - `injectRegister: null` (registro feito pelo nosso wrapper)
  - `devOptions: { enabled: false }`
  - `filename: "sw.js"`
  - `manifest`:
    - `name`: "GestãoPro"
    - `short_name`: "GestãoPro"
    - `description`: "Sistema de Gestão de Projetos – J&A Engenharia"
    - `start_url`: "/"
    - `display`: "standalone"
    - `orientation`: "portrait"
    - `background_color`: "#ffffff"
    - `theme_color`: cor primária do projeto (Navy do design system — confirmar HSL em `src/index.css` e converter)
    - `icons`: 192x192 e 512x512 (PNG)
  - `workbox`:
    - `navigateFallbackDenylist: [/^\/~oauth/, /^\/calendario\/callback/]`
    - HTML navegações: `NetworkFirst`
    - Assets hash same-origin: `CacheFirst`
    - APIs Supabase (`*.supabase.co`): `NetworkFirst`

## 3. Ícones

- Gerar `public/icons/icon-192x192.png` e `public/icons/icon-512x512.png` a partir do logo institucional J&A (ou placeholder se o logo atual não estiver em `public/`).
- Adicionar `public/apple-touch-icon.png` (180x180).

## 4. `index.html`

Adicionar no `<head>`:
- `<link rel="manifest" href="/manifest.webmanifest" />` (gerado pelo plugin)
- `<meta name="theme-color" content="<cor primária>" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
- `<meta name="apple-mobile-web-app-title" content="GestãoPro" />`
- `<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />`

## 5. Wrapper de registro do SW

Criar `src/pwa/registerSW.ts` que **recusa registro** quando:
- `!import.meta.env.PROD`
- está em iframe (`window.self !== window.top`)
- hostname começa com `id-preview--` ou `preview--`
- hostname termina em `.lovableproject.com`, `.lovableproject-dev.com`, `.beta.lovable.dev`
- URL tem `?sw=off`

Nesses casos, faz `unregister()` de qualquer SW antigo em `/sw.js`. Em produção real (ex.: `gestaoproja.lovable.app`), registra `/sw.js` no `window.load`.

Importar esse wrapper em `src/main.tsx` (uma linha, sem mexer no resto).

## 6. Componente `InstallPWABanner`

Criar `src/components/InstallPWABanner.tsx` e montar uma vez em `src/components/AppLayout.tsx` (rodapé/canto, discreto, estilizado com tokens do design system — sem cores hardcoded):

- Escuta `beforeinstallprompt` (Android/Chrome): guarda o evento, mostra botão "Instalar app". No clique, chama `prompt()`.
- Persistência em `localStorage`:
  - `pwa-install-dismissed` → não mostra mais se usuário fechar.
  - `pwa-install-accepted` → não mostra após instalar (`appinstalled` event).
- Detecção iOS Safari: `/iphone|ipad|ipod/i.test(ua)` e `!(window.navigator as any).standalone` → mostra instrução: "Para instalar, toque em Compartilhar → Adicionar à Tela de Início".
- Esconde automaticamente se já estiver rodando em modo standalone (`matchMedia('(display-mode: standalone)')`).

## 7. Verificação

- Build local para garantir que o plugin gera `sw.js` e `manifest.webmanifest`.
- Confirmar visualmente no preview que **nenhum SW é registrado** (o preview deve continuar funcionando normalmente).
- Banner aparece em mobile/Chrome quando o navegador dispara `beforeinstallprompt`.

---

## Detalhes técnicos (para referência)

- Por que não `public/sw.js` manual: o preview Lovable roda em iframe sob `id-preview--*.lovable.app`. Um SW registrado lá interfere com HMR e pode servir HTML antigo causando tela branca — exatamente o sintoma que já tratamos neste projeto. O wrapper guardado + `vite-plugin-pwa` é o caminho oficial para evitar isso.
- `injectRegister: null` garante que o único registrador é o nosso wrapper.
- `NetworkFirst` em navegações evita "app instalado nunca atualiza".
- `/calendario/callback` excluído do fallback para não quebrar o OAuth do Google Calendar.
