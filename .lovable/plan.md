# Download direto do relatório vem incompleto

## Causa confirmada

Existem dois caminhos de geração de PDF em `src/pages/Relatorios.tsx`:

- **Abrir o relatório e clicar "Gerar PDF"**: usa os dados consolidados pela função `consolidar()`, que calcula prazos, progresso físico ponderado, aditivos, data de início real e planejamento.
- **Ícone de download na lista** (`handleDownloadRelatorio`): monta os dados de forma resumida e envia campos zerados/incompletos ao PDF.

Diferenças concretas no caminho de download:

- `percentualTempo: 0` e `percentualExecutado: 0` fixos — no PDF isso vira "Prazo Consumido 0%", "Progresso Físico 0%" e status da obra calculado errado.
- `dataInicioReal` usa o primeiro diário **do período**, não o primeiro diário da obra (o correto, usado na consolidação).
- Prazos vêm apenas dos campos gravados no registro do relatório; se estiverem vazios (relatório antigo ou nunca consolidado), o PDF sai com zeros. Os aditivos não são somados ao prazo contratual.
- Paralisações são buscadas mas não usadas; dias parados não são recalculados.

## O que será feito

1. Extrair a lógica de consolidação (prazos, dias parados, dias trabalhados, aditivos, progresso ponderado do cronograma, data de início real) para uma função reutilizável, sem estado de tela.
2. Fazer `handleDownloadRelatorio` usar exatamente essa mesma função, para que o PDF baixado pela lista seja idêntico ao gerado dentro do relatório.
3. Manter `consolidar()` alimentando a tela com os valores dessa função, sem mudar o comportamento atual da edição.

## Detalhes técnicos

- Novo helper (ex.: `src/lib/relatorioDados.ts`) com `carregarDadosRelatorio(obraId, inicio, fim)` retornando `{ diarios, equipe, atividades, materiais, ocorrencias, imagens, paralisacoes, cronograma, aditivos, planejamentoConfigurado, prazos }`.
- `consolidar()` passa a chamar o helper e apenas distribui o resultado nos estados; a criação/atualização do registro em `relatorios` continua na página.
- `handleDownloadRelatorio` chama o helper com `rel.obra_id`, `rel.data_inicio`, `rel.data_fim`, mantendo o fallback de diários vinculados por `relatorio_id`, e passa assinaturas/versões já buscadas.
- Sem alteração de banco de dados.

## Verificação

Baixar pela lista um relatório assinado e comparar com o PDF gerado abrindo o mesmo relatório: prazos, progresso físico, prazo consumido, status da obra, cronograma e fotos devem ser iguais.
