# Correção: anexo enviado na criação de Receita/Despesa não aparece

## O que muda para o usuário
- Ao criar receita ou despesa com arquivo, aparece um seletor "Tipo do anexo" (Nota Fiscal padrão / Boleto).
- O anexo passa a aparecer imediatamente na linha do registro e na aba Notas Fiscais.
- Se o registro salvar mas o anexo falhar: o registro fica salvo e aparece o aviso "Receita salva, mas o anexo não foi enviado. Abra o registro e anexe novamente." (idem Despesa).

## Detalhes técnicos
Arquivo `src/features/financeiro/hooks/useFinanceiroMutations.ts`:
1. Extrair de `uploadAnexos` a função interna `uploadParaFinanceiroAnexos({ registroId, tipoRegistro, tipoAnexo, file })` — mesmo bucket `anexos`, mesmo padrão de caminho `financeiro/{tipoRegistro}/...`, mesmo insert em `financeiro_anexos`. `uploadAnexos` passa a chamá-la sem mudar comportamento.
2. `criarReceita` / `criarDespesa`: `insert(payload).select('id').single()`, sem o campo `anexo`; se houver arquivo, chamar a função com o id; falha do anexo → toast de aviso, registro mantido. `onSuccess` invalida também `financeiroPrefixes.anexos`.
3. Remover `uploadArquivo` (fica sem uso neste arquivo; as ocorrências em Documentação são funções próprias). Coluna `anexo` permanece intocada.

`NovaReceitaDialog.tsx` e `NovaDespesaDialog.tsx`: Select "Tipo do anexo" visível quando houver arquivo, padrão `nota_fiscal`, enviado à mutation e resetado ao fechar/limpar.

Fora do escopo: migration, dados antigos, parcelas, RLS/Storage policies.

## Verificação
Build/tipos e, no preview, criar receita com PDF (NF) e despesa com imagem (Boleto) conferindo exibição imediata; criar sem anexo; anexar depois pelo fluxo atual.
