# Regra canônica de Prazo e Progresso Global (tela de Cronograma)

O status da obra (Adiantada / Em Dia / Atrasada) passa a descontar os dias parados e a contar o progresso dos aditivos. Relatórios e PDFs ficam de fora desta etapa.

## O que muda para o usuário
- **Card de Progresso**: quando há aditivo, mostra em destaque o "Progresso Global da Obra" e, logo abaixo, o Contrato original e cada aditivo com sua própria barra. Sem aditivo, fica como hoje.
- **Aviso amarelo** quando existem atividades de aditivo sem vínculo: elas não entram no progresso. O aviso não aparece em obra concluída.
- **Indicadores**: a célula "Executado (global)" e a nova célula "Dias úteis consumidos", com a conta "decorridos − parados" e os dias de aditivo incluídos.
- **Aviso de dias úteis sem diário** (até 10 datas e depois "e mais N"). Esses dias contam como prazo consumido.
- **Aditivo** exige pelo menos 1 dia útil. Com 0 dias, não salva.
- **Nova atividade** só pode ser do tipo "Original". Atividades de aditivo são criadas pela tela do Aditivo.
- Depois de lançar ou excluir um diário ou uma paralisação, o Cronograma já abre com os números atualizados.

## Regras de cálculo
- Prazo contratual: usa os dias informados na obra. Se não houver, conta os dias úteis entre o início e o fim previsto. Se também não houver datas, fica 0.
- Dias parados: dias úteis cobertos pelas paralisações, entre o primeiro diário e a data de corte. Uma data repetida conta uma única vez, e sábado e domingo não contam.
- Data de corte: obra concluída usa o último diário ou, se não houver, o fim previsto. Obra ativa usa hoje.
- Prazo consumido = (decorridos − parados) ÷ (contratual + dias de aditivo).
- Global = (Contrato × dias contratuais + Σ progresso de cada aditivo × dias do aditivo) ÷ (dias contratuais + Σ dias dos aditivos).
- Desvio = Global − Prazo consumido. Os limites de ±5 continuam iguais.

## Detalhes técnicos
- Novo `src/lib/prazoObra.ts` com as funções:
  - `prazoContratualBase`
  - `datasUteisParadas`
  - `diasUteisSemDiario`
  - `calcularProgressoGlobal`
  - `calcularPrazoConsumido`

  Ele usa `calcBusinessDays` e `calcularProgressoEscopo`, sem alterar esses dois.
- Novo `src/lib/prazoObra.test.ts` com todos os casos obrigatórios da especificação. Exemplos: global 70; global 64 com aditivos 17; consumido 30/60.
- `useObraPrazoInfo.ts`:
  - mantém a mesma queryKey;
  - inclui `data_inicio` na busca da obra;
  - busca todas as datas de diário e as paralisações deles;
  - passa a retornar também `datasDiarios` e `paralisacoes`.
- `utils.ts`:
  - `calcularIndicadores` passa a receber um único objeto de parâmetros;
  - entram os novos campos: `progressoContrato`, `progressoGlobal`, `progressoPorAditivo`, `atividadesAditivoSemVinculo`, `diasParados`, `diasConsumidos`, `diasSemDiario`;
  - `progressoGeral` continua igual ao do contrato, porque o PDF do cronograma usa esse valor;
  - `progressoAditivos` passa a ser ponderado pelos dias de cada aditivo;
  - `businessDaysBetween` só é removido se ficar sem uso.
- `useCronogramaPage.ts`:
  - nova chamada de `calcularIndicadores`;
  - validação de pelo menos 1 dia em `handleSaveAditivo`.
- Ajustes de tela em `ProgressoGeralCard.tsx` e `IndicadoresCard.tsx`, e só as props dos cards em `Cronograma.tsx`.
- O `ProgressoGeralCard` recebe a nova prop `obraConcluida: boolean`, passada pelo `Cronograma.tsx`. O alerta de vínculo só aparece quando `obraConcluida === false`.
- `AditivoDialog.tsx`: só o campo Dias Adicionais muda (`min=1`, placeholder "Ex.: 10").
- `AtividadeDialog.tsx`: só o Select de tipo muda.
- `useDiarioMutations.ts`:
  - remove o import sem uso `totalDiasParalisacao`;
  - invalida `['obra-prazo-cronograma', obraId]` nos 4 onSuccess pedidos.
- Fica de fora: banco, migrations, `progressoFisico.ts`, `dias.ts`, relatórios, PDFs, AtividadesCard, AditivosCard, Gantt, CronogramaHeader e os componentes do diário.

## Validação
- Rodar os testes com vitest, incluindo `prazoObra.test.ts`.
- Conferir o Cronograma de uma obra sem aditivo e de uma com aditivo (Espíndula). Na Espíndula, que está concluída, o aviso não deve aparecer, e as atividades sem vínculo continuam fora do cálculo.
