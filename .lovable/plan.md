## Objetivo
Adicionar campo "Voltagem" no cadastro de ferramentas, visível apenas quando o Tipo for "Elétrica".

## Alterações

### 1. Banco de dados (migração)
- Adicionar coluna `voltagem TEXT` (nullable) na tabela `ferramentas`.

### 2. `src/pages/Ferramentas.tsx`
- Adicionar `voltagem` na interface `Ferramenta` e no estado (`useState`).
- Resetar/preencher `voltagem` em `resetForm` e ao editar.
- Incluir `voltagem` no payload salvo (apenas se tipo = `eletrica`; caso contrário salvar `null`).
- No diálogo de cadastro/edição: renderizar condicionalmente um campo `<Select>` "Voltagem *" quando `tipo === 'eletrica'`, com opções: **110V**, **220V**, **Bivolt (110V/220V)**, **380V**.
- Validação: se tipo elétrica, exigir voltagem preenchida antes de salvar.
- Exibir a voltagem como badge/texto na coluna Tipo da tabela (ex.: "Elétrica · 220V") para ferramentas elétricas.

## Fora do escopo
- Sem alterações em relatórios, PDFs ou outros módulos.
- Sem alterações nos históricos ou manutenções.