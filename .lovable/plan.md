## Objetivo
Permitir rolagem vertical no menu lateral esquerdo (desktop) para acessar todos os itens em telas de baixa altura.

## Alteração
Arquivo: `src/components/AppSidebar.tsx`

- Na `<nav>` que lista os itens, trocar `flex-1 px-3 py-4 space-y-1` por `flex-1 overflow-y-auto px-3 py-4 space-y-1` para habilitar scroll quando o conteúdo ultrapassar a altura disponível.
- Garantir que header (logo/empresa) e footer (email/sair) permaneçam fixos — o `<aside>` já usa `flex flex-col` com `h-screen`, então apenas a `<nav>` central rola.
- Opcional: adicionar classes de estilização de scrollbar discreta (`scrollbar-thin`) — ou manter o scrollbar nativo do navegador para simplicidade.

## Fora do escopo
- Mobile (`MobileSidebar.tsx`) — usuário indicou que já funciona.
- Reorganização/agrupamento de itens do menu.