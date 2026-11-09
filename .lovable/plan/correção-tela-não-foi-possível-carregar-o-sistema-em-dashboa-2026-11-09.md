# Correção: tela "Não foi possível carregar o sistema" em /dashboard

## Diagnóstico (lido no console da pré-visualização)
Mensagem registrada como `[AppErrorBoundary]` (18:16:24 UTC):

```text
Error: useAuth must be used within an AuthProvider
  at useAuth (src/contexts/AuthContext.tsx?t=1794246438460:171)
  at EmpresaSetup (src/components/EmpresaSetup.tsx:15)
componentStack: EmpresaSetup > div > AppLayout > RenderedRoute > Routes > Suspense
  > AuthProvider > Router > BrowserRouter > AppErrorBoundary > ... > App
```
O erro de execução correspondente aponta o mesmo problema em `AppSidebar`.

**Causa real:** não é falha de carregamento de módulo (nada de "Failed to fetch dynamically imported module" ou ChunkLoadError). O `AuthProvider` está na árvore, mas o `?t=...` no endereço mostra que o arquivo de autenticação foi recarregado ao vivo pela pré-visualização. Hoje esse arquivo cria o contexto (`createContext`) e também exporta o Provider e o hook. Quando ele é recarregado, um contexto novo é criado: o Provider já montado continua com o objeto antigo, e os componentes que leem com o objeto novo (EmpresaSetup, AppSidebar) não encontram valor. Por isso aparece "useAuth must be used within an AuthProvider". Acontece logo depois de alterações no código, em sequência, e por isso parecia repetitivo. Isso contraria a regra já registrada no projeto: contexto num `.ts`, Provider num `.tsx`.

Como a causa não é carregamento de módulo, o item 2 (trocar por `lazyWithReload`) não resolve este erro e fica fora desta correção. Se quiser, aplico depois como medida preventiva.

## Correção (somente a causa apontada)
1. Novo `src/contexts/authContextObject.ts` com apenas o tipo `AuthContextType` e o `createContext(...)`. Este arquivo quase nunca muda, então o objeto de contexto mantém a mesma identidade nos recarregamentos ao vivo.
2. `src/contexts/AuthContext.tsx` passa a importar o contexto desse arquivo e mantém `AuthProvider` e `useAuth` com os mesmos nomes e comportamento. Os 43 arquivos que importam de `@/contexts/AuthContext` não mudam.
3. Nada muda em regras, banco, permissões, Painel da Obra, Financeiro, Laudos, service worker ou AppErrorBoundary.
4. Atualizar a regra correspondente em AGENTS.md (uma linha).

## Verificação
- Tipos e build sem erros.
- Pré-visualização: abrir /dashboard como admin e como síndico, recarregar várias vezes e navegar Dashboard → Relatórios → Laudos sem a tela de erro.
- Editar `AuthContext.tsx` durante a sessão e confirmar no console que o erro não reaparece.
