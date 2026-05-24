# Dashboard Personalizável — Plano de Implementação

## Escopo

Transformar **apenas** o Dashboard em ambiente personalizável. Nenhuma rota, tabela existente, query, hook ou outro módulo será modificado. Toda a lógica/dados dos widgets reutiliza o que já existe em `src/pages/Dashboard.tsx`.

## Arquivos afetados

**Novos:**
- `supabase/migrations/...` — cria tabela `dashboard_layouts`
- `src/components/dashboard/DashboardGrid.tsx` — wrapper react-grid-layout
- `src/components/dashboard/WidgetFrame.tsx` — moldura com borda tracejada, ⚙️, 👁, handles
- `src/components/dashboard/WidgetLibrary.tsx` — painel lateral "Adicionar Widget"
- `src/components/dashboard/WidgetConfigDialog.tsx` — modal de configuração individual
- `src/components/dashboard/widgets/*.tsx` — um arquivo por widget (KPI, gráficos, agenda, ferramentas, listas)
- `src/components/dashboard/widgetRegistry.ts` — catálogo `{ id, label, categoria, tamanhoPadrão, component }`
- `src/hooks/useDashboardLayout.ts` — load/save layout + fallback padrão
- `src/types/dashboard.ts` — tipos de WidgetInstance, LayoutItem, WidgetConfig

**Modificados (apenas Dashboard):**
- `src/pages/Dashboard.tsx` — refatorado para consumir hooks/queries atuais e renderizar via `DashboardGrid`. Lógica de fetch e cálculos permanece idêntica; apenas a apresentação muda.

**Não tocados:** sidebars, rotas, AuthContext, integrações Google Calendar, Supabase client, qualquer outro `src/pages/*` ou `src/components/*` fora de `dashboard/`.

## Banco de dados

Nova migration (única alteração no schema):

```sql
CREATE TABLE public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout_name text NOT NULL DEFAULT 'default',
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  grid_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, layout_name)
);
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
-- RLS: usuário só lê/escreve/deleta os próprios layouts (auth.uid() = user_id)
-- Trigger update_updated_at_column existente reaproveitada
```

## Fase 1 — Modo de edição

Botão **"Personalizar Dashboard"** no header do Dashboard (ao lado de "Criar Diário" / "Nova Obra"). Estado `editMode` em `Dashboard.tsx`. Quando ativo:

- `WidgetFrame` aplica `border-dashed border-2 border-primary/40` + leve `ring`
- Drag handle no header do card; resize handles via react-grid-layout
- Ícone ⚙️ abre `WidgetConfigDialog`
- Ícone 👁 marca `hidden: true` no widget
- Header do Dashboard troca para **"Salvar Layout"** / **"Cancelar"**
- Drawer (sheet) lateral direito: `WidgetLibrary`

Cancelar reverte para snapshot inicial; Salvar persiste em `dashboard_layouts` e sai do modo.

## Fase 2 — Grid responsivo

Usar `react-grid-layout` (`bun add react-grid-layout`). 12 colunas desktop, 2 tablet, 1 mobile via `WidthProvider` + `Responsive`. Tamanhos preset:

- pequeno `w:3 h:2` · médio `w:6 h:3` · grande `w:9 h:4` · full `w:12 h:auto`

Animação 200ms ease via classes globais já permitidas.

## Fase 3 — Biblioteca de widgets

Cada widget é componente puro que recebe `config` e usa os MESMOS dados já buscados hoje em `Dashboard.tsx`. A busca permanece centralizada no Dashboard (ou movida para hook local `useDashboardData`) e os dados passam por context para os widgets — assim nenhuma query nova é criada.

Catálogo no `widgetRegistry`:

- **Obras:** em andamento, concluídas, atrasadas, evolução física média
- **Financeiro:** Total Contratos, Total Recebido, Total Gastos, Parcelas Atrasadas, Gráfico Despesas por Tipo, Evolução Mensal, Contas a receber, Contas a pagar
- **Ferramentas:** Resumo de ferramentas
- **Agenda:** Agenda do Dia
- **Cronograma:** Atividades pendentes, Atividades em atraso
- **Diário de Obra:** Últimos registros

Widgets já existentes (`AgendaDoDiaWidget`, resumo ferramentas, gráficos, KPIs) são extraídos em wrappers para o registry sem alterar seu código interno quando possível.

## Fase 4 — Configuração individual

`WidgetConfigDialog` controla por instância:

- Título (string)
- Cor do header (color picker simples — `<input type="color">`)
- Tipo de visualização (apenas opções que fazem sentido para aquele widget)
- Período: hoje / 7d / 30d / 3m / custom (date range)
- Obra: dropdown alimentado pela lista já carregada em `useObrasFiltered`
- Ações: Salvar / Duplicar / Excluir

Config salva em `widgets[].config` no JSONB.

## Visual

Mantém tokens atuais (`bg-card`, `border-border`, primary etc.). Skeleton via `Skeleton` shadcn. Highlight de edição via `ring-2 ring-primary/30`.

## Persistência

`useDashboardLayout()`:
1. On mount → `select * from dashboard_layouts where user_id = auth.uid() and layout_name='default'`
2. Se vazio → retorna layout padrão hard-coded (replica posicionamento atual)
3. `saveLayout(widgets, gridConfig)` faz upsert

## Validação final

Antes de concluir: `rg` para garantir que diffs estão restritos a `src/pages/Dashboard.tsx`, `src/components/dashboard/**`, `src/hooks/useDashboardLayout.ts`, `src/types/dashboard.ts`, e a nova migration.

## Detalhes técnicos

- Dependência nova: `react-grid-layout` + `@types/react-grid-layout`
- CSS do react-grid-layout importado em `src/index.css` ou no `DashboardGrid` (`react-grid-layout/css/styles.css`, `react-resizable/css/styles.css`)
- `WidgetInstance`: `{ id, type, title?, color?, size, visualizationType?, period?, obraId?, hidden? }`
- `LayoutItem` (rgl): `{ i, x, y, w, h, minW, minH }`
- Default layout: array hard-coded em `useDashboardLayout` que reproduz a ordem atual (KPIs → Agenda → Ferramentas → gráficos)
