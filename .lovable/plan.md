# Relatório e PDF do Cronograma com a mesma regra de prazo do Cronograma

## Objetivo
Relatório (tela e PDF) e PDF do Cronograma passam a usar a regra canônica já usada na tela do Cronograma: dias parados descontados do prazo consumido, e status pelo Progresso Global (contrato + aditivos ponderados pelos dias). Relatórios já assinados continuam idênticos.

## Regra de compatibilidade
- Campos novos de prazos são opcionais. "Dado novo" = `percentualContrato !== undefined`.
- Sem dado novo (snapshots assinados antigos) → tela e PDF exatamente como hoje.

## Mudanças
1. **relatorioDados.ts (cálculo ao vivo)**
   - Tipo de prazos ganha `decorridos`, `percentualContrato`, `percentualAditivos`, `progressoPorAditivo` (opcionais).
   - Prazo base via `prazoContratualBase(obra)`; efetivo = base + Σ dias de aditivos.
   - Dias parados por datas úteis distintas (`datasUteisParadas`), no período e no total da obra (consulta passa a ler `data_inicio, data_fim`).
   - decorridos, trabalhados = decorridos − paradosTotal, ajustado inalterado, saldo = efetivo − trabalhados, percentualTempo via `calcularPrazoConsumido`.
   - `calcularProgressoGlobal(..., prazoBase)`: executado = global; contrato/aditivos/porAditivo retornados.
   - Sem tocar em carregarDadosRelatorio, buscarSnapshotCongelado, calcularProgressoGeralPdf, baselineAtividades.
2. **IndicadoresPrazo.tsx** — com dado novo: "Progresso Físico (global)", linha de detalhe Contrato/Aditivos, segunda linha com Início Real | Decorridos | Parados período | Parados total | Trabalhados | Prazo Ajustado.
3. **ResumoTab.tsx** — com dado novo: "Obra executada (global)", "Execução (global)", detalhe "Contrato original: X% • Aditivos: Y%".
4. **pdfRelatorio.ts** — Resumo Executivo com "Progresso Físico Global" + linhas Contrato/Aditivo n; "Dias Úteis Decorridos" e "Dias Úteis Trabalhados" no lugar de "Dias Trabalhados"; card "Progresso Global" (cor mantida); seção Cronograma "Progresso do Contrato Original". Congelamento, aditivos detalhados, capa, fotos e assinaturas intactos.
5. **PDF do Cronograma** — exportPDF passa `progressoGlobal` e `progressoContrato` (só com aditivos); pdf.ts mostra "Progresso Global" + "Contrato original: X%" quando houver.
6. **Diário** — botão rápido "Feriado" adicionado aos motivos.

## Fora do escopo
Sem migrations/dados; sem tocar em prazoObra.ts, progressoFisico.ts, dias.ts, indicadores.ts, utils.ts de relatórios, hooks, relatório final, regra de status ±5.

## Validação
- Testes existentes passando.
- Assinado antigo idêntico; rascunho sem aditivo/paralisação com mesmos percentuais e Decorridos = Trabalhados; com paralisação o Prazo Consumido cai e o Saldo não muda.
- Leal Reis: global + Contrato/Aditivo 1 na tela e PDF; PDF do Cronograma com "Progresso Global".
