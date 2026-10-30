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
const prazosBase = semCamposNovos(
  snap.prazos_congelados && snap.prazos
    ? snap.prazos
    : snap.prazos
      ? { ...vivoLegado, ...snap.prazos }
      : vivoLegado,
);
```

O resto do `return` (aditivos, cronograma, congelado, `percentualExecutado = snap.progresso_fisico`) fica idêntico.

## Ponto de atenção
O item 3 pede remover os 4 campos em TODOS os assinados com snapshot, inclusive o que já tem a marca (Leal Reis 05/10–16/10). Se o snapshot dele tiver algum desses campos, ele deixaria de mostrar "Dias Úteis Decorridos"/linhas de aditivo. Pelos dados vistos antes, o snapshot dele guarda só contratualBase/diasAditivos/contratual/parados/paradosTotal/ajustado — então não deve mudar. Vou conferir no banco (só leitura) antes de aplicar.

## Validação
- Rodar os testes de cálculo existentes.
- Ler o snapshot dos dois relatórios do Leal Reis e conferir os valores esperados (70 / 1 / 71 no de 28/09–02/10).
- Rascunhos não passam por esse caminho (sem snapshot), então seguem a regra nova.
