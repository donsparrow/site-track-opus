# Code splitting por rota

Dividir o bundle por página para reduzir o carregamento inicial, sem mudar nenhuma rota nem o comportamento de navegação.

## O que muda

1. **Páginas carregadas sob demanda**: todas as páginas do `App.tsx` passam a usar `React.lazy` com import dinâmico. `Auth` e `AppLayout` continuam estáticos por serem o caminho crítico (primeira tela e casca do app).
2. **Fallback de carregamento**: um `Suspense` envolvendo as rotas, com um skeleton de página novo (`src/components/PageSkeleton.tsx`) no mesmo estilo dos skeletons já usados nas features (Card + linhas de `Skeleton`): título, faixa de filtros e algumas linhas de tabela.
3. **Recuperação de chunk quebrado após deploy**: quando o navegador tenta buscar um chunk antigo que não existe mais (erro "Failed to fetch dynamically imported module"), o app recarrega a página **uma única vez**, marcando a tentativa em `sessionStorage` para nunca entrar em loop de reload. Aplicado num helper `lazyWithReload` usado por todos os imports dinâmicos, mais um listener global para `unhandledrejection`/`vite:preloadError`.
4. **Verificação do build**: rodar o build e conferir no relatório de chunks que `jspdf`, `xlsx`, `recharts`, `tiptap`, `pdfjs-dist`, `react-signature-canvas` e `react-grid-layout` ficam nos chunks das rotas que os usam (Relatórios, Cronograma, Dashboard, Documentação, Obra, Financeiro) e não no chunk de entrada.

## Detalhes técnicos

- Novo `src/lib/lazyWithReload.ts`: envolve `React.lazy(factory)`, captura falha do dinâmico, checa flag em `sessionStorage` (`chunk-reload`) e chama `window.location.reload()` só na primeira vez; se já recarregou, propaga o erro normalmente.
- Novo `src/components/PageSkeleton.tsx` reutilizando `@/components/ui/skeleton` e `Card`.
- `App.tsx`: imports de páginas trocados por `lazyWithReload(() => import("./pages/X"))`; `<Suspense fallback={<PageSkeleton />}>` dentro do `BrowserRouter`/`AuthProvider`, envolvendo `<Routes>`. `ProtectedRoute` e a estrutura de rotas permanecem idênticos.
- Nada é alterado em `vite.config.ts` a menos que o build mostre alguma dependência pesada ainda presa ao chunk inicial — nesse caso, ajuste pontual de `manualChunks`.
- Sem mudanças em regras de negócio, layout ou navegação.
