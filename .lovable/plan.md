## Problema

Na planilha real (`Cronograma_NEMA_Jardim_Camburi.xlsx`) os cabeçalhos verdadeiros estão na **linha 4** (`ID | Atividade | Início | Fim | Dur. | Equipe | ...80 colunas Gantt`), mas o parser escolheu a linha 1 porque `G1='Início: 06/05/2026 ...'` casou por substring com `inicio`. Resultado: a coluna A (IDs e títulos de seção) virou "Atividade" e datas vieram vazias.

## Correções em `src/lib/cronogramaImport.ts`

### 1. Detecção de cabeçalho por pontuação
Substituir "primeira linha com ≥1 match" por "linha com a **maior quantidade** de matches dentre as primeiras 10 linhas, exigindo no mínimo 2 matches". Empate → primeira linha. Se ninguém atingir 2, manter linha 0.

### 2. `matchColumn` mais estrito
Trocar `key.includes(c)` por matching baseado em **tokens** (separar por não-alfanumérico) com:
- igualdade exata em qualquer token, OU
- `startsWith` quando o token tem ≥3 chars e o cabeçalho normalizado tem ≤8 chars.

Isso impede que `"inicio06052026en"` case com `inicio`, mas mantém `"datainicio"` casando.

### 3. Aliases adicionais
- `duracao_dias`: adicionar `dur`, `dur.`, `qtd` 
- `data_inicio`: adicionar `data` apenas quando combinada (já coberto por `datainicio`)
- `observacoes`: adicionar `equipe`, `responsavel`, `descritivo` como secundários (fallback baixa prioridade)

### 4. Skip de linhas de seção
Em `rowsFromObjects`, descartar linha quando:
- todas as colunas mapeadas (exceto `nome_atividade`) estão vazias **E**
- o nome bate com padrão de seção: `/^\d+(\.\d+)*\.?\s+[A-ZÀ-Ú]/` (ex.: `1. SERVIÇOS`, `2.1. ALGO`) **E** não tem nenhum dígito-data.

Alternativa: sempre exigir `data_inicio` OU `data_fim` para incluir como atividade — mais simples e robusto.

Adotar a alternativa: **só inclui linha se tiver `nome` + (data_inicio OU data_fim OU duracao)**. Linhas de seção sem datas são silenciosamente puladas. Isso preserva o caso CSV simples (que sempre tem datas) e elimina seções do XLSX/PDF.

### 5. Parser PDF — não muda
Já requer pelo menos uma data por linha, então seções não entram. Sem mudança.

## Validação

Após implementar, rodar mentalmente sobre a planilha do usuário:
- headerIdx → 3 (linha 4), com 4 matches: Atividade, Início, Fim, Dur.
- Linha 5 (`1. SERVIÇOS PRELIMINARES`) → sem datas → pulada ✓
- Linha 6 (`1.1 | Mobilização... | 06/05/2026 | 08/05/2026 | 3`) → atividade válida ✓
- 56 atividades reais devem aparecer (em vez das 65 atuais com IDs/seções misturados).

## Arquivos tocados
- `src/lib/cronogramaImport.ts` — apenas funções `matchColumn`, `rowsFromMatrix`, `rowsFromObjects`. Nenhuma mudança em UI, schema ou outros módulos.

## Fora de escopo
- Importar dados de Equipe como campo separado (vai continuar perdida — só nome, datas, duração e observações são importados, conforme spec original).
- Importar diretamente do layout Gantt (barras coloridas em G:CF) — datas estão nas colunas C/D explicitamente.
