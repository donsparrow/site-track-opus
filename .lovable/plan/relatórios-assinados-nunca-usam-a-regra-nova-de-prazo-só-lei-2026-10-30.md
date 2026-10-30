# Relatórios assinados nunca usam a regra nova de prazo (só leitura)

Alteração única em `src/lib/relatorioDados.ts`, função `carregarDadosRelatorio` (linha 119). Nada no banco é tocado.

## Mudança

```ts
const CAMPOS_NOVOS = ["decorridos", "percentualContrato", "percentualAditivos", "progressoPorAditivo"] as const;
const semCamposNovos = (p: any) => {
  const c = { ...p };
  for (const k of CAMPOS_NOVOS) delete c[k];
  return c;
};
const vivoLegado = semCamposNovos(vivo.prazos);
const prazosBase =
  snap.prazos_congelados && snap.prazos
    ? snap.prazos // usado exatamente como gravado, inclusive campos novos
    : snap.prazos
      ? semCamposNovos({ ...vivoLegado, ...snap.prazos })
      : vivoLegado;
```

O resto do `return` (aditivos, cronograma, congelado, `percentualExecutado = snap.progresso_fisico`) fica idêntico.

## Validação
- Rodar os testes de cálculo existentes.
- Leal Reis 28/09–02/10 (assinado, sem marca): Prazo Contratual 70, Dias Parados 1, Prazo Ajustado 71; rótulos antigos; sem "Dias Úteis Decorridos".
- Leal Reis 05/10–16/10 (com marca): sem mudança.
- Snapshot com marca e campos novos continua exibindo "Progresso Físico (global)" e "Dias Úteis Decorridos".
- Rascunhos (sem snapshot) seguem a regra nova.
