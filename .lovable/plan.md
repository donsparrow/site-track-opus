## Plano: Cronograma como Fonte Oficial + Gestão de Aditivos

Reestruturação em 2 fases para tornar o Cronograma a fonte oficial do planejamento e o Diário a fonte oficial da execução, com suporte a aditivos.

---

### FASE 1 — Cronograma oficial + Diário vinculado

**1.1 Banco de Dados (migration)**
- `cronograma_atividades`: adicionar `tipo_atividade text default 'original'` (valores: `original` | `aditivo`), `observacoes text`.
- `diario_atividades`: tornar `cronograma_atividade_id` **obrigatório** para novos registros (mantém nullable para legados). Adicionar índice.
- Nova tabela `obra_aditivos`:
  - `obra_id`, `descricao`, `dias_adicionais int default 0`, `data_aprovacao date`, `justificativa text`, `documento_url text`, `responsavel_aprovacao text`, `empresa_id`, `created_at`, `created_by uuid`.
  - RLS por `empresa_id`.
- Nova tabela `cronograma_historico` (auditoria):
  - `atividade_id`, `acao` (criada/alterada/excluida), `peso_anterior`, `peso_novo`, `data_inicio_anterior/nova`, `data_fim_anterior/nova`, `usuario_id`, `created_at`, `empresa_id`.

**1.2 `src/pages/Cronograma.tsx`**
- Mostrar **percentual acumulado dos pesos** com barra ("85% / 100% — faltam 15%").
- Bloquear salvar se soma > 100%; alertar (mas permitir) se < 100%.
- Novo campo `tipo_atividade` no form (badge "ORIGINAL" / "ADITIVO").
- Cards de indicadores: se **não houver atividades** → exibir estado neutro "⚪ Planejamento não configurado" e ocultar Progresso/Prazo/Desvio/Status.
- Botão **"+ Adicionar Aditivo"** abre dialog: cria atividade `tipo='aditivo'` + registro em `obra_aditivos` com dias adicionais, justificativa, data aprovação, upload de documento.
- Seção **"Aditivos da Obra"** listando todos os aditivos com impacto em prazo e peso.
- Prazo efetivo = `prazo_contratual_dias` + Σ`dias_adicionais` dos aditivos aprovados.

**1.3 `src/pages/DiarioObra.tsx`**
- Remover campo livre `descricao` no formulário de atividades do diário.
- Substituir por `<Select>` carregando atividades do cronograma da obra (incluindo aditivos), agrupadas por tipo.
- Se obra não tem cronograma → exibir aviso: "Cadastre atividades no Cronograma antes de registrar execução" + link para Cronograma.
- Ao salvar: grava `cronograma_atividade_id` + `descricao` (espelhada do nome da atividade p/ compatibilidade) e atualiza `percentual_concluido` no cronograma.

**1.4 `src/pages/Relatorios.tsx` e `src/lib/pdfRelatorio.ts`**
- Se obra sem atividades de cronograma → Resumo Executivo exibe "Planejamento da obra ainda não configurado." sem mostrar Progresso/Prazo/Desvio/Status.
- Caso contrário: usar prazo efetivo (com aditivos) no cálculo de Prazo Consumido.
- Nova seção PDF **"ADITIVOS DA OBRA"**: tabela com descrição, data aprovação, impacto %, dias adicionais, responsável.

---

### FASE 2 — Compatibilidade legado

- Diários antigos sem `cronograma_atividade_id` continuam visíveis (read-only legacy badge).
- No Cronograma, banner se existirem diários órfãos: "X registros sem atividade vinculada — [Associar]" abre dialog para mapear cada um a uma atividade.

---

### Detalhes técnicos

**Storage**: usar bucket `anexos` para `documento_url` dos aditivos (path `aditivos/{obra_id}/{file}`).

**Fórmulas**:
- `progresso_total = Σ(peso_i × percentual_i) / 100` (sobre TODAS atividades, original+aditivo).
- `peso_total_escopo = Σ(peso_i)` — pode passar de 100 com aditivos (ex: 115%).
- `prazo_efetivo_dias = prazo_contratual_dias + Σ dias_adicionais(aditivos)`.
- `prazo_consumido_pct = dias_uteis_decorridos / prazo_efetivo_dias × 100`.
- `desvio = progresso_executado - prazo_consumido`.
- Status: só calcula se houver ≥1 atividade no cronograma.

**Auditoria**: trigger AFTER UPDATE em `cronograma_atividades` grava em `cronograma_historico` quando `peso`, `data_inicio` ou `data_fim` mudam.

**Arquivos a editar**:
- `supabase/migrations/...` (1 nova migration)
- `src/pages/Cronograma.tsx`
- `src/pages/DiarioObra.tsx`
- `src/pages/Relatorios.tsx`
- `src/lib/pdfRelatorio.ts`
- `src/integrations/supabase/types.ts` (auto)

**Memórias a atualizar** após implementação:
- `mem://logic/obras/cronograma-peso-progresso-ponderado` (incluir aditivos no escopo)
- Nova memória `mem://features/obras/aditivos-gestao-escopo`