# Módulo Relatório Final — plano de implementação

Novo módulo para Relatório Final de Entrega de Obra: 1 relatório por obra, com snapshot editável dos dados, seções em editor rico, registro fotográfico pré/pós-obra, assinaturas digitais (empresa + síndico) e PDF profissional.

## Fase 1 — Banco, permissões, rota e página base

Banco (migração):
- `relatorios_finais` (UNIQUE por `obra_id`) e `relatorio_final_fotos` conforme especificado, com índices, `updated_at` trigger, RLS habilitada e GRANTs para `authenticated`/`service_role`.
- Policies: admin/super_admin acesso total (escopado por `empresa_id` do usuário, seguindo o padrão multi-tenant já usado no projeto); síndico apenas SELECT nas obras vinculadas via `usuario_obras`, mais UPDATE restrito somente aos campos de assinatura do síndico (necessário para ele conseguir assinar).
- Trigger `set_empresa_id` no insert, como nas demais tabelas.

Permissões e navegação:
- Registrar `relatorio_final` em `src/hooks/usePermissions.ts` (type, `MODULOS`, `MODULO_LABELS`, `ROUTE_MODULE_MAP` → `/relatorio-final`).
- Defaults em `src/features/usuarios/constants.ts`: admin/super_admin total, síndico só visualizar, trabalhador/cliente sem acesso. A função `set_default_permissions` no banco também precisa incluir o novo módulo.
- Item "Relatório Final" (ícone FileCheck) em `AppSidebar.tsx` e `MobileSidebar.tsx`, após Relatórios.
- Rota lazy em `App.tsx` protegida por `modulo="relatorio_final"`.

Página `src/pages/RelatorioFinal.tsx`:
- Seletor de obra (obras do tenant / obras vinculadas para síndico), com badge "Relatório existente".
- Obra sem relatório: botão "Criar Relatório Final", que grava o snapshot (cliente, endereço, responsável, datas).
- Card "Dados da Obra" com campos do snapshot editáveis e botão Salvar. Síndico em modo leitura.

## Fase 2 — Editor completo

- `src/components/RichTextEditor.tsx`: extrai a configuração tiptap já usada em `AnotacoesObra.tsx` (StarterKit, Underline, Link, TextStyle, Color, Highlight) com props `content/onChange/placeholder/minHeight/readOnly`. `AnotacoesObra.tsx` permanece intocado.
- Feature folder `src/features/relatorio-final/` com `RelatorioFinalEditor`, `DadosObraCard`, `SecaoEditor`, `CapaUpload`, `FotosManager`, `FotoCard`, `AssinaturasCard`, além dos hooks `useRelatorioFinal` e `useRelatorioFinalMutations` (React Query, no padrão dos demais módulos).
- Seções: Objetivo, Garantia, Aditivo (com toggle de inclusão) e Conclusão, todas com título editável.
- Fotos: upload múltiplo para `anexos/relatorio-final/{obra_id}/fotos/`, legenda inline, tipo pré/pós-obra, reordenação por setas, exclusão com confirmação, numeração sequencial pela ordem visual.
- Assinaturas: dialog com `react-signature-canvas`, upload em `anexos/relatorio-final/{obra_id}/assinaturas/`; empresa só para admin, síndico apenas para o síndico da obra; status vira `assinado` quando as duas existirem.
- Campo de link externo com label configurável.

## Fase 3 — PDF

- `src/lib/pdfRelatorioFinal.ts` com jsPDF, reutilizando `loadImageAsDataUrl` e o padrão de `src/lib/pdfShared.ts`.
- Capa (faixa navy + foto + dados + logo), cabeçalho/rodapé em todas as páginas, seções de texto com parser HTML simplificado (parágrafos, negrito, listas), blocos fotográficos pré e pós-obra com 2 fotos por página e legendas, conclusão, link externo e página final de assinaturas.
- Botão "Gerar PDF" no editor, usando `pdfDownload.ts` (compatível com iOS) e nome `Relatorio_Final_{obra}_{data}.pdf`.

## Detalhes técnicos que o prompt original não cobre

1. **Storage**: o bucket `anexos` é privado e o acesso é filtrado por `public.can_read_anexo(name)`. Sem alteração, o síndico não conseguiria ver capa, fotos nem assinaturas. A migração da Fase 1 vai estender essa função para liberar leitura de arquivos referenciados pelo relatório final de obras vinculadas, e as URLs serão resolvidas por signed URL (`src/lib/anexoUrl.ts`) — não por URL pública.
2. **Upload pelo síndico**: só será permitido no prefixo de assinaturas da própria obra.
3. **Compressão**: imagens redimensionadas para no máximo 1200px de largura antes do upload, evitando PDFs pesados.
4. **Types do Supabase**: regenerados automaticamente após a migração.
5. **Escopo**: nenhum arquivo fora dos listados será refatorado.
