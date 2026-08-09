# Paralisações no módulo Relatórios

Hoje as paralisações já são consolidadas em `relatorioDados.ts` (tabela `diario_paralisacoes`), mas nunca chegam ao PDF nem à tela do relatório. Além disso, a numeração das seções do PDF é fixa: quando uma seção condicional fica vazia (ex.: sem materiais), a numeração pula (7 → 9).

Alterações restritas aos 5 arquivos indicados. Sem migrations, sem mexer em `relatorioDados.ts` nem no Diário de Obra.

## 1. `src/features/relatorios/pdf.ts`

Passar `paralisacoes: dados.paralisacoes` para `gerarRelatorioPDF`, logo após `ocorrencias`.

## 2. `src/lib/pdfRelatorio.ts`

- Interface `RelatorioPDFData`: novo campo opcional
  `paralisacoes?: { motivo, data_inicio, data_fim | null, total_dias | null, diario_id? }[]`.
- Numeração automática: após `sectionTitle`, criar contadores `sec` / `subSec` e trocar todos os títulos hardcoded (1..13 e 10.1) por títulos numerados dinamicamente, mantendo exatamente a ordem atual. Seções condicionais que não renderizam não consomem número.
- Nova seção **PARALISAÇÕES**, entre Ocorrências e Cronograma:
  - `autoTable` com colunas Motivo / Início / Término / Dias, datas em pt-BR e "Em aberto" quando `data_fim` é nulo;
  - linha de rodapé com o total de dias parados;
  - nota em itálico amarrando o total ao item de Controle de Prazo;
  - sempre renderizada: sem registros, exibe "Não houve paralisações registradas no período."

## 3. `src/features/relatorios/components/RegistrosTab.tsx` (novo)

Aba de visualização no padrão visual de `ResumoTab.tsx`, usando Card/Table/Badge do shadcn:

- 4 cards-resumo: total de paralisações, total de dias parados, paralisações em aberto, total de ocorrências;
- tabela de Paralisações (motivo, início, término, dias) com badge para "Em aberto";
- tabela de Ocorrências (descrição, impacto) com badge por impacto;
- estados vazios com texto próprio em cada tabela.

## 4. `src/features/relatorios/components/RelatorioEditor.tsx`

Nova aba `value="registros"` — "Paralisações e Ocorrências" — entre "Evolução Diária" e "Assinaturas", alimentada por `dadosExibicao` e com o mesmo skeleton de carregamento das demais abas.

## 5. `types.ts` + `utils.ts`

- `SnapshotDados`: novo campo `paralisacoes_count`.
- `buildSnapshot`: preenche com `dados.paralisacoes.length`.
- `detectChanges`: compara o campo e gera a linha `Paralisações: X → Y`, para que alterações em paralisações produzam nova revisão.

## Observações técnicas

- `dadosVazios` em `utils.ts` já contém `paralisacoes: []`, então nenhum ajuste extra é necessário nos estados vazios.
- Snapshots antigos não têm `paralisacoes_count`; `detectChanges` já trata campos ausentes com fallback `0`, evitando revisões falsas.
- Nenhuma alteração no layout de cabeçalho/rodapé (`pdfShared.ts`).
