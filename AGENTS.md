# Architecture rules

- Render technical-report section bodies through `src/lib/pdfRichText.ts` while retaining the shared PDF layout; this preserves selectable formatted text without rasterizing sections.
- Plan addendum activity synchronization through `aditivoSync.ts` and omit progress/status from existing-row updates; this preserves daily progress while isolating changes to the selected addendum.
- Scope app-shell recovery to the app worker and its known caches, coordinate boot/chunk/boundary reset guards, and retain NetworkFirst HTML with preview registration guards; this avoids stale releases, reload loops and interference with auth or messaging.
- Register client report signatures through the protected RPC and derive release status from the newest active PDF signature count; client downloads must never regenerate unreleased signatures.
- Share signer-name lookup through `useNomeAssinante` between report list and editor; this keeps profile-based prefilling consistent without duplicate query logic.
- Keep archived-PDF storage SELECT governed by record RLS without filtering soft-deletion, and restrict direct company INSERT to super admins while preserving the protected onboarding RPC; storage removal needs SELECT after soft-deletion.

- Keep the auth context object in `src/contexts/authContextObject.ts`, separate from the Provider/hook file; live reloads of the provider must not create a new context identity.
- Enforce technical-report visibility and signed-content/photo locks in database policies and ordered triggers; UI guards alone cannot protect API writes, and issuance dates must survive later PDF generation.
- Route technical-report list/detail through search parameters, share signature-derived status and invalidate the list prefix after mutations; this preserves panel deep links and consistent state across list and reader.

# Performance rules

- Keep technical-report autosave serialized, diff-only and local form initialization keyed by report ID; flush before navigation, preview, PDF and signing to avoid losing or overwriting active edits.

- Toda leitura do Supabase feita por componentes ou hooks usa React Query
  (useQuery/useQueries). PROIBIDO buscar dados com useEffect + useState.
- Hooks de dados usados por vários componentes usam a MESMA queryKey,
  definida em um único lugar: uma requisição por dado, nunca uma por
  componente.
- queryKeys de dados que dependem do usuário incluem user.id (e role
  quando o resultado depende dela). No logout, chamar queryClient.clear().
- Skeleton/spinner apenas no primeiro carregamento (isLoading). Atualização
  em segundo plano (isFetching) nunca esconde conteúdo já exibido.
- Após mutações, invalidar somente as queryKeys afetadas. Nunca recarregar
  a página nem invalidar tudo.
- Consultas independentes rodam em paralelo (Promise.all/useQueries).
  Evitar cascata sequencial de requisições.
- select com colunas explícitas; proibido select('*') em listagens. Listas
  que crescem com o tempo usam limite ou paginação.
- Não baixar todas as linhas de tabelas que crescem (despesas, receitas,
  parcelas) só para somar no navegador em telas novas; preferir agregação
  no banco (view/RPC).
- Imagens são comprimidas no navegador antes do upload (máx. 1920 px,
  JPEG ~0,8). <img> fora da primeira dobra usa loading="lazy" e
  decoding="async".
- Bibliotecas pesadas (jspdf, xlsx, recharts, @tiptap, html2canvas,
  pdfjs-dist) só via import dinâmico no momento do uso ou dentro de
  componente lazy. Nunca importar no topo de layout, sidebar ou
  componentes compartilhados.
