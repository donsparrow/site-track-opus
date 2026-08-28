# Relatório Final — Visualização do Síndico

## Objetivo
Criar uma visualização de leitura do Relatório Final para usuários com papel `sindico`, sem toolbars/inputs/uploads. Único elemento interativo: botão "Assinar" do síndico. Editor atual permanece intacto para admin/super_admin.

## Arquivos

### 1. Novo: `src/features/relatorio-final/components/RelatorioFinalViewer.tsx`
Componente de leitura com props `{ relatorio, fotos, obraNome, onAssinar, assinarPending }`. Usa `useSignedUrls` para resolver paths do bucket privado. Seções (de cima para baixo):

- **A) Preview da Capa** — só se `template_capa_url` ou `foto_capa_url` existir. Com ambos: miniatura 300px com template como fundo (object-cover), título "RELATÓRIO DE VISTORIA PÓS-OBRA" sobreposto no topo (text-shadow) e foto de capa centralizada. Só com foto: foto em tamanho médio.
- **B) Dados da Obra** — apenas campos preenchidos (cliente, CPF/CNPJ, endereço, responsável, datas de início/conclusão/vistoria formatadas em pt-BR), grid 2 colunas desktop / 1 mobile, label em `font-semibold`.
- **C) Seções de conteúdo** — para cada par da constante `SECOES` (introducao, garantia, aditivo, conclusao), renderizar somente se `conteudo_*` estiver preenchido: título do campo `titulo_*` e HTML via `dangerouslySetInnerHTML` com `className="prose prose-sm max-w-none"`.
- **D/E) Registro Fotográfico** — Pré-obra e Pós-obra, renderizados só se houver fotos do tipo. Título com contagem, grid 2/1 colunas, legenda "Foto {n} — {legenda}" com numeração por `ordem`.
- **F) Link Externo** — só se `link_externo` preenchido: label (`link_externo_label` ou "Link de acesso") e âncora `target="_blank"` azul sublinhada.
- **G) Assinaturas** — grid 2 colunas: bloco Empresa (imagem + nome/cargo/data, ou "Aguardando assinatura da empresa") e bloco Síndico (idem, ou botão "Assinar" abrindo o `AssinarDialog` de `@/features/relatorios/components/AssinarDialog`, mesmo padrão do `AssinaturasCard`).

### 2. Modificar: `src/pages/RelatorioFinal.tsx`
- Obter `role` do `useAuth()` e calcular `isSindico = role === 'sindico'`.
- Renderização condicional: se `isSindico`, renderizar `RelatorioFinalViewer` (com `onAssinar={(tipo, values) => m.assinar.mutate({ tipo, ...values })}` e `assinarPending={m.assinar.isPending}`); caso contrário, o bloco do editor existente **inalterado**.
- Seletor de obra e botão "PDF" continuam visíveis para o síndico; "Gerar Relatório Final" já é controlado por `canCreate`.
- Importar o novo componente.

## Fora de escopo (não alterar)
`RelatorioFinalEditor.tsx`, `AssinaturasCard.tsx`, `FotosManager.tsx`, `pdfRelatorioFinal.ts`, hooks, mutations, `pdfShared.ts`.

## Detalhes técnicos
- `role` já exposto pelo AuthContext (confirmado); `link_externo`, `link_externo_label` e `data_vistoria` já existem na tabela `relatorios_finais`.
- RLS já restringe as obras visíveis ao síndico; o seletor funcionará sem mudanças.
- Verificação: `tsgo` para tipos + conferência visual da página como admin (editor intacto).
