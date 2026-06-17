## Objetivo

Adicionar na aba **Cronograma** um botão **"Importar Cronograma"** que aceita arquivos PDF, XLS, XLSX e CSV, lê automaticamente as atividades, mostra tela de pré-visualização editável e só grava após confirmação do usuário. Nada na estrutura atual (tabela, CRUD, Gantt, PDF) será alterado — apenas adição.

## Escopo

### 1. Novo botão na barra de ações
- Posicionado ao lado de **"Nova Atividade"** em `src/pages/Cronograma.tsx`
- Visível apenas com permissão de edição (`canEdit`)
- Ícone `Upload` (lucide-react)

### 2. Novo componente: `src/components/cronograma/ImportarCronogramaDialog.tsx`

Fluxo em 3 etapas dentro de um Dialog grande:

**Etapa 1 — Upload**
- Input `<input type="file" accept=".pdf,.xls,.xlsx,.csv">`
- Detecta extensão e roteia para o parser correto
- Mostra instruções de colunas esperadas: `Atividade | Início | Fim | Duração | Observações` (qualquer ordem; cabeçalhos detectados por nome aproximado em pt-BR/EN)

**Etapa 2 — Pré-visualização editável**
- Tabela com colunas editáveis inline: Atividade · Início · Fim · Duração (dias) · Peso (%) · Observações
- Botões: **Distribuir pesos automaticamente** (100/N) · **Adicionar linha** · **Remover linha**
- Edição de datas recalcula duração; edição de duração recalcula `data_fim` a partir de `data_inicio`
- Painel de validação no topo:
  - ⚠️ Datas inválidas (fim < início, formato inválido)
  - ⚠️ Atividades duplicadas (mesmo nome)
  - ⚠️ Duração inconsistente (fim-início ≠ duração informada)
  - ⚠️ Soma de pesos ≠ 100%
- Resumo: nº atividades · data inicial · data final · duração total (dias) · peso total (%)
- Botão **Confirmar Importação** desabilitado se houver erro bloqueante (datas inválidas)

**Etapa 3 — Gravação**
- Insere em `cronograma_atividades` em lote, mantendo `ordem` sequencial (após a última existente)
- `tipo_atividade = 'original'`, `status = 'nao_iniciado'`, `percentual_concluido = 0`
- Após sucesso: fecha dialog, dispara `loadCronograma()` na página → cronograma atualiza imediatamente
- Toast com resumo (X atividades importadas)

### 3. Parsers

Novo arquivo `src/lib/cronogramaImport.ts` com:

- `parseCSV(file)` — usa `papaparse` (já leve, adicionar)
- `parseXLSX(file)` — usa `xlsx` (SheetJS)
- `parsePDF(file)` — usa `pdfjs-dist` (já presente no projeto via PDF preview) para extrair texto; tenta detectar linhas tabulares por regex de datas (`dd/mm/yyyy`, `yyyy-mm-dd`) e separadores

Saída normalizada:
```ts
type ImportedRow = {
  nome_atividade: string;
  data_inicio: string | null; // ISO yyyy-mm-dd
  data_fim: string | null;
  duracao_dias: number | null;
  observacoes: string | null;
}
```

Detecção de colunas tolerante: `atividade|tarefa|descrição|nome`, `início|inicio|start|data inicial`, `fim|término|termino|end|data final`, `duração|duracao|dias|duration`, `observações|observacoes|notes|obs`.

### 4. Integrações já existentes (sem mudanças)
Como as atividades importadas vão para `cronograma_atividades`, elas **automaticamente** aparecem em:
- Diário de Obra (que já lê atividades do cronograma da obra)
- Relatórios (que já consolidam o cronograma)
- Gantt e PDF da página Cronograma

Nenhuma mudança nesses módulos é necessária.

### 5. Validações implementadas
| Validação | Tipo | Ação |
|---|---|---|
| Data inválida ou fim < início | Bloqueante | Impede confirmar |
| Atividade duplicada (mesmo nome) | Aviso | Permite, mas destaca |
| Duração ≠ (fim-início) | Aviso | Auto-corrige ao editar |
| Soma de pesos ≠ 100 | Aviso | Botão "distribuir auto" |
| Linha sem nome de atividade | Bloqueante | Impede confirmar |

## Detalhes técnicos

- **Dependências novas**: `xlsx` e `papaparse` (+ `@types/papaparse`). `pdfjs-dist` reutilizado.
- **Sem migration**: estrutura `cronograma_atividades` já tem todos os campos necessários (`nome_atividade`, `data_inicio`, `data_fim`, `peso`, `observacoes`, `ordem`, `tipo_atividade`).
- **Inserção**: usa `supabase.from('cronograma_atividades').insert([...])` em lote único; `empresa_id` herdado por trigger.
- **Arquivos tocados**:
  - `src/pages/Cronograma.tsx` — adicionar botão + estado `importOpen` + callback `onImported`
  - `src/components/cronograma/ImportarCronogramaDialog.tsx` — novo
  - `src/lib/cronogramaImport.ts` — novo (parsers)
  - `package.json` — `xlsx`, `papaparse`, `@types/papaparse`

## Fora de escopo
- Editar PDF/XLS originais
- Importar pesos do arquivo (peso é sempre definido manualmente ou distribuído auto)
- Substituir cronograma existente (apenas anexa novas atividades; usuário exclui antigas manualmente se quiser)
