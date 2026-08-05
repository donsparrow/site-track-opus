# Padronizar anexos em URLs assinadas (bucket privado)

## Estado atual verificado

Duas coisas importantes já estão diferentes do que você descreveu:

1. **O bucket `anexos` já está privado** (`public = false`). Não há etapa manual pendente no painel — a "virada de chave" já aconteceu.
2. **Não existe política "Anyone can view anexos".** As políticas atuais do bucket já são só para usuários autenticados:
   - SELECT: "Empresa view anexos" (autenticados, escopo por empresa)
   - INSERT: "Auth upload anexos"
   - UPDATE: "Owner update anexos"
   - DELETE: "Owner delete anexos"

Ou seja: o passo 6 do seu pedido já está feito e o passo 7 não é necessário. O que resta são as pontas que ainda gravam ou leem URL pública.

## Auditoria dos pontos de acesso

Gravação (upload):
- `src/pages/DiarioObra.tsx` — grava caminho relativo. OK
- `src/pages/Financeiro.tsx` — caminho relativo. OK
- `src/components/NovaReceitaDialog.tsx` / `NovaDespesaDialog.tsx` — caminho relativo. OK
- `src/pages/Relatorios.tsx` (assinaturas) — caminho relativo. OK
- `src/pages/Configuracoes.tsx` (logo) — caminho relativo. OK
- `src/pages/Ferramentas.tsx` (linha 232) — **grava URL pública** (`getPublicUrl`). A corrigir.
- `src/pages/Documentacao.tsx` (linha 246) — **grava URL pública**. A corrigir.

Leitura:
- `AnexoPreviewDialog`, `DiarioObra`, `Financeiro`, `Relatorios`, `Configuracoes`, `useEmpresaLogo` — já usam `resolveAnexoUrl`/`resolveLogoUrl`. OK
- `src/pages/Documentacao.tsx` (linha 176) — usa `createSignedUrl` direto, sem tratar registros legados em URL pública. A padronizar.

PDFs:
- `src/lib/pdfShared.ts` — logo já resolvida. OK
- `src/lib/pdfRelatorio.ts` linha 828 — fotos do diário já resolvidas. OK
- `src/lib/pdfRelatorio.ts` linha 139 e `src/lib/pdfDashboard.ts` linha 97 — **usam `emp.logo_url` cru**. A corrigir.
- `src/lib/pdfRelatorio.ts` linha 891 — assinatura usa `sig.assinatura_url`; hoje já vem resolvida pela página, mas fica frágil. Vou resolver defensivamente também no PDF.

Dados legados no banco (registros com URL completa / total):
diario_imagens 4/9 · financeiro_anexos 8/8 · documentos_arquivos 3/3 · assinaturas 3/4 · configuracoes_empresa.logo_url 6/11 · despesas.anexo 1/16 · receitas.anexo 1/5 · imagens 0 · compras_materiais 0 · compras_ferramentas 0.

## O que será feito

1. **`src/lib/logoUrl.ts` / `anexoUrl.ts`**: adicionar cache em memória (`Map` caminho → `{ url, expiraEm }`), com reuso enquanto faltar mais de 5 min para expirar e regeração automática depois. Mantém a assinatura da função, então nenhum chamador muda. Continua funcionando com bucket público ou privado (a URL assinada é válida nos dois casos).
2. **`Ferramentas.tsx`** e **`Documentacao.tsx`**: gravar caminho relativo no lugar de `getPublicUrl`.
3. **`Documentacao.tsx`**: download/preview passa por `resolveAnexoUrl` (cobre registros legados).
4. **`pdfRelatorio.ts` e `pdfDashboard.ts`**: resolver a logo via `resolveLogoUrl` antes de embutir; resolver a assinatura via `resolveAnexoUrl` como fallback.
5. **Migration SQL**: normalizar as colunas legadas, removendo os prefixos `.../storage/v1/object/public/anexos/`, `/sign/anexos/` e `/authenticated/anexos/` e o querystring de token, em `diario_imagens.url`, `financeiro_anexos.url_arquivo`, `documentos_arquivos.url_arquivo`, `assinaturas.assinatura_url`, `imagens.url`, `configuracoes_empresa.logo_url`, `despesas.anexo`, `receitas.anexo`, `compras_materiais.anexo`, `compras_ferramentas.anexo`.

A migration é segura mesmo se rodar antes do código: as funções de leitura já aceitam caminho relativo.

## Checklist de teste

- Configurações: logo aparece após salvar e ao recarregar.
- Diário de Obra: miniaturas das fotos (registros novos e antigos) carregam.
- Financeiro: pré-visualizar e baixar nota fiscal/boleto, inclusive anexos antigos.
- Documentação: enviar arquivo novo, pré-visualizar e baixar; abrir um arquivo antigo.
- Ferramentas: registrar manutenção com anexo e reabrir.
- Relatórios: assinatura visível na tela e no PDF; PDF com logo e fotos do diário.
- Dashboard: exportar PDF executivo e conferir a logo.
