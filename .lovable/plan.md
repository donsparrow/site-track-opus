## Objetivo

1. Eliminar o status "gerado pdf revNN" dos relatórios (mantendo Rascunho, Finalizado, Assinado, Excluído).
2. No Histórico do relatório, mostrar no resumo qual usuário gerou/baixou o PDF — registrando apenas na primeira vez de cada usuário.
3. Validar de fato que a atualização de status (assinatura) está funcionando.

## 1. Remover o status "gerado pdf"

- Ao gerar PDF, o status do relatório **não muda** (rascunho continua rascunho; assinado continua assinado). Continua-se apenas incrementando a revisão (`revisao_pdf`) e criando nova versão quando houver alterações reais de conteúdo.
- Nas novas versões criadas ao gerar PDF, gravar o status atual do relatório em vez de "gerado pdf revNN".
- Remover o tratamento especial de `status.startsWith('gerado pdf')` no badge da lista e no badge do Histórico.
- Manter o botão de download visível para relatórios com `revisao_pdf > 0` ou assinados.
- Migração de dados: converter os 5 relatórios existentes com status "gerado pdf revNN" para `rascunho` (nenhum deles está assinado), e normalizar os registros de `relatorio_versoes` com esse status para `rascunho`.

## 2. Autor do PDF no Histórico

- A aba Histórico passa a exibir uma coluna "Usuário", buscando o nome em `profiles` a partir de `criado_por` da versão.
- No resumo da versão, quando o PDF for gerado/baixado, acrescentar a marcação "PDF gerado por <nome>".
- Regra de uma vez por usuário: antes de anexar essa marcação ou criar log de download, verificar em `relatorio_logs` se já existe registro de PDF daquele `usuario_id` para aquele relatório. Se já existir, não duplicar nada no histórico (o PDF é gerado normalmente, só não gera novo registro).
- Isso vale tanto para a geração dentro do relatório aberto quanto para o download direto pela lista.

## 3. Teste da atualização de status

- Verificação no banco: hoje nenhum relatório está com status `assinado` — vou confirmar, após o ajuste, se assinar grava `assinado` corretamente.
- Teste automatizado no preview (Playwright) percorrendo: abrir relatório → assinar → conferir badge na lista → gerar PDF → conferir que o status permanece o mesmo e que o histórico mostra o autor do PDF apenas uma vez.

## Detalhes técnicos

- Arquivo principal: `src/pages/Relatorios.tsx` (`handleGerarPDF`, `handleDownloadRelatorio`, `handleSign`, `statusBadge`, aba `versoes`).
- Migração de dados via UPDATE em `relatorios` e `relatorio_versoes`.
- Consulta de nomes: `profiles.nome` por `user_id` em lote para as versões carregadas.
