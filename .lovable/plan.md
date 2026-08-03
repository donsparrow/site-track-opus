# Corrigir download de anexos no Financeiro

## Problema confirmado

No módulo Financeiro, ao anexar nota fiscal/boleto o sistema salva um link "público" do arquivo, mas o bucket de anexos é privado. Resultado: o link salvo não abre e o download falha (mesmo comportamento que já foi corrigido antes na Documentação, no Diário de Obra e nas assinaturas de relatórios).

Isso afeta tanto os anexos de nota fiscal/boleto quanto os arquivos enviados nos formulários de Nova Receita e Nova Despesa.

## O que será feito

1. Salvar o caminho do arquivo (e não um link público) ao enviar anexos no Financeiro, em Nova Receita e em Nova Despesa.
2. No momento do download/visualização, gerar um link temporário assinado e baixar o arquivo com o nome original.
3. Manter compatibilidade com os anexos já cadastrados: links antigos serão convertidos automaticamente para o caminho correspondente antes de gerar o link assinado, então os documentos existentes voltam a abrir sem precisar reenviar.

## Detalhes técnicos

- `src/pages/Financeiro.tsx`:
  - `handleAnexoUpload`: gravar `path` em `url_arquivo` no lugar de `getPublicUrl`.
  - `handleDownload`: tornar assíncrono — usar `resolveAnexoUrl` (de `src/lib/anexoUrl.ts`) para obter a URL assinada, buscar o blob e disparar o download via `pdfDownload`/objectURL, preservando `nome_arquivo` e funcionando em iOS/tablet.
  - Aplicar o mesmo em `renderAnexosInline` e na aba de documentos/relatório de NFs (a geração do PDF de NFs continua igual).
- `src/components/NovaReceitaDialog.tsx` e `src/components/NovaDespesaDialog.tsx`: salvar `path` no campo `anexo` em vez de URL pública.
- Sem alterações de banco de dados: as políticas atuais do bucket privado já permitem leitura por usuários da mesma empresa, então a URL assinada funciona para toda a equipe.
