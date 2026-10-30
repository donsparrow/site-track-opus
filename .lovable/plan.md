# Arquivo de PDFs de relatórios assinados (somente banco)

Cria o local seguro para guardar o PDF de cada relatório assinado, com exclusão só por administradores e rastro de quem excluiu. Nenhuma tela muda nesta etapa.

## Passos
1. **Pasta de arquivos privada** `relatorios-assinados`: privada, até 50 MB, só PDF.
2. **Tabela `relatorio_pdfs_assinados`** com as colunas exatamente como no pedido (inclui sha256, tamanho > 0, origem `assinatura`/`arquivamento_posterior`, gerado_por/em, excluido_em/por), índice `(relatorio_id, gerado_em desc)`, permissões de acesso (SELECT/INSERT para usuários logados + total para serviço) e RLS ligado.
3. **Regras da tabela** (usando `(select auth.uid())`):
   - Ver: mesma regra de "Empresa view relatorios".
   - Inserir: perfil operacional, mesma empresa, sem marca de exclusão, relatório da empresa e assinado.
   - Sem regras de editar nem apagar.
4. **Função `excluir_pdf_assinado(_id)`**: só admin; marca excluido_em/excluido_por na própria empresa; erro se não encontrado ou já excluído; execução só para usuários logados.
5. **Regras dos arquivos** (caminho `{empresa_id}/{relatorio_id}/arquivo.pdf`): enviar (operacional, empresa certa, relatório assinado), ver (só se houver registro na tabela), apagar (só admin da empresa). Sem regra de sobrescrever.
6. Rodar o verificador de segurança e **só reportar** alertas novos, sem corrigir.

## Não muda
Pasta `anexos` e suas regras, tabelas existentes, dados, nenhum arquivo em `src/`.

## Detalhes técnicos
- Bucket via ferramenta de criação de bucket (50MB); restrição `application/pdf` aplicada via atualização do bucket se suportada — caso a ferramenta não aceite tipo MIME, reporto e deixo a checagem no INSERT do storage (`storage.extension(name) = 'pdf'`) apenas se você aprovar.
- Uma migration em `drizzle/migrations/` com tabela, GRANTs (`SELECT, INSERT` para authenticated; `ALL` para service_role), RLS, políticas, função (`REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated`) e políticas em `storage.objects`.
- `gerado_por default auth.uid()`; FKs conforme pedido (inclusive para auth não há FK).
