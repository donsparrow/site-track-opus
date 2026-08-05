# Congelar os indicadores do Resumo Executivo do relatório

## Passo 1 — Diagnóstico (confirmado nos dados)

**(a) De onde vem hoje o "Progresso Físico Executado"**

O PDF (`src/lib/pdfRelatorio.ts`) apenas imprime `data.prazos.percentualExecutado`. Quem calcula esse valor é `carregarDadosRelatorio()` em `src/lib/relatorioDados.ts`, chamada tanto pelo editor (`useRelatorioDados`) quanto pelo download da lista (`useRelatorioMutations`). O cálculo é a média ponderada do estado **atual** de `cronograma_atividades` (peso × percentual_concluido), sem nenhum filtro por data — ou seja, lê o cronograma como ele está no momento do download.

**(b) Por que antes dava 52% e agora dá 64%**

A fórmula é a mesma de antes da refatoração (verifiquei o código anterior: idêntica média ponderada sobre o cronograma corrente). O que mudou foi **de onde o número vinha na hora de baixar**:

- Antes, o relatório do Espíndula 27/07–31/07 foi fechado em 31/07 e os indicadores daquele fechamento ficaram gravados no snapshot da versão (`relatorio_versoes.snapshot_dados`). Confere no banco: REV 03 e REV 04 desse relatório trazem `percentualExecutado: 52`, `percentualTempo: 39`.
- Depois da refatoração, o download passou a **sempre recalcular** com `carregarDadosRelatorio()`. Somando o cronograma atual da obra dá exatamente 63,75% → **64%**, que é o número errado que aparece hoje.

Ou seja: as atividades do cronograma foram avançando depois de 31/07, e o PDF passou a refletir o presente em vez do fechamento.

**(c) Como o 52% foi originalmente derivado**

Média ponderada de `cronograma_atividades` (Σ peso × percentual_concluido ÷ Σ pesos), avaliada **na data de fechamento** e persistida no snapshot da versão. Não é um recorte por `data_fim` das atividades — tanto que restringir as atividades com fim até 31/07 daria 51%, não 52%. O 52% é literalmente a foto do cronograma em 31/07.

Consequência importante: **não existe como recalcular retroativamente o 52%** a partir do cronograma (não há histórico de percentuais por data). A única fonte fiel é o snapshot gravado. Por isso o plano usa snapshot como fonte, e não uma nova fórmula com filtro de data.

## Passo 2 + 3 — Correção por snapshot congelado

### Banco (migration)

Novas colunas em `relatorios`, todas nulas por padrão:

`progresso_fisico`, `prazo_consumido`, `desvio`, `status_obra`, `dias_trabalhados_snapshot`, `dias_parados_snapshot`, `diarios_registrados`, `indicadores_congelados_em`.

(`dias_trabalhados` e `dias_parados` já existem na tabela; as versões `_snapshot` evitam colidir com o uso atual dessas colunas.)

Backfill dos relatórios existentes lendo a versão mais recente com `snapshot_dados` de cada relatório:

- Espíndula 27/07–31/07 → progresso 52, prazo consumido 39, desvio +13.
- Espíndula 21/07–24/07 → progresso 26, prazo consumido 17, desvio +9.
- Relatórios antigos cujo snapshot não tem os campos de percentual ficam com progresso/desvio nulos (o PDF então cai no cálculo atual, como hoje).

### Aplicação

- Ao salvar/publicar/assinar um relatório (`useRelatorioMutations`), gravar nas novas colunas os indicadores calculados naquele momento — é o ato de congelamento.
- Na geração do PDF e no Resumo Executivo da tela, se o relatório tiver indicadores congelados, usar **esses valores**; recalcular apenas quando forem nulos (rascunho nunca efetivado).
- `getSmartStatus`/desvio passam a derivar dos valores congelados, então status e desvio ficam coerentes com o progresso mostrado.
- Dias trabalhados, dias parados e diários registrados seguem a mesma regra: congelados quando existirem.

### Não muda

Layout do PDF, lista de atividades, cronograma/Gantt, fotos, assinaturas e versionamento continuam exatamente como estão.

## Verificação

Baixar o relatório 27/07–31/07 do Espíndula: Progresso Físico Executado = 52%, Prazo Consumido = 39%, Desvio = +13%. Baixar o de 21/07–24/07: 26% / 17%. Alterar o percentual de uma atividade no Cronograma e baixar de novo os mesmos relatórios: os números não podem mudar. Criar um relatório novo, efetivar e conferir que ele grava e reexibe seus próprios indicadores.
