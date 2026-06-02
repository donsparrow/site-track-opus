## Diagnóstico

O que estava sendo salvo: o campo `size` do `WidgetInstance` (em `widgets[]`).

O que NÃO estava sendo aplicado: as dimensões `w` e `h` no `gridConfig.lg/md/sm` — que são as únicas props que o `react-grid-layout` realmente lê para renderizar o tamanho dos cards.

Fluxo atual em `src/pages/Dashboard.tsx` (`handleSaveWidget`, linha 74):

```ts
setWidgets(ws => ws.map(w => w.id === next.id ? next : w));
```

Apenas o array `widgets` é mutado. O `gridConfig` permanece com o `w/h` antigo, então o RGL continua renderizando no tamanho anterior. Após recarregar a página, o `buildDefaultGrid` é chamado para layouts sem grid persistido e aí sim reflete o novo `SIZE_PRESETS`, mas no save em runtime nada toca o grid.

## Correção

### 1. Mapeamento explícito de tamanhos
Atualizar `SIZE_PRESETS` em `src/types/dashboard.ts` para os valores pedidos:

```
small:  w=3,  h=2
medium: w=6,  h=2
large:  w=6,  h=4
full:   w=12, h=4
```

(mantendo `minW`/`minH` razoáveis)

### 2. Aplicar w/h no grid ao salvar widget
Em `src/pages/Dashboard.tsx`, reescrever `handleSaveWidget` para detectar mudança de `size` e atualizar `gridConfig` em todos os breakpoints (lg/md/sm) sincronizando `w` e `h` do item cujo `i === next.id`. Se o item não existir no grid (widget novo), inserir um item com os presets.

Pseudo:
```ts
const handleSaveWidget = (next: WidgetInstance) => {
  const prev = widgets.find(w => w.id === next.id);
  setWidgets(ws => ws.map(w => w.id === next.id ? next : w));
  if (!prev || prev.size !== next.size) {
    const p = SIZE_PRESETS[next.size];
    const patch = (arr?: GridLayoutItem[]) => {
      if (!arr) return arr;
      const found = arr.find(l => l.i === next.id);
      if (!found) return [...arr, { i: next.id, x: 0, y: Infinity, w: p.w, h: p.h, minW: p.minW, minH: p.minH }];
      return arr.map(l => l.i === next.id ? { ...l, w: p.w, h: p.h, minW: p.minW, minH: p.minH } : l);
    };
    setGridConfig(gc => ({ lg: patch(gc.lg), md: patch(gc.md), sm: patch(gc.sm) }));
  }
};
```

O RGL re-renderiza automaticamente quando recebe novo `layouts` prop, então a alteração é imediata, sem reload.

### 3. Persistência
Quando o usuário clica "Salvar Layout", o `save(widgets, gridConfig)` existente já envia o `gridConfig` atualizado para `dashboard_layouts`. Nada a alterar lá.

### 4. Duplicar
Em `handleDuplicateWidget`, também inserir um item no grid com presets do tamanho do duplicado, evitando que o duplicado herde dimensões fantasma.

## Escopo
- `src/types/dashboard.ts` — ajustar SIZE_PRESETS.
- `src/pages/Dashboard.tsx` — `handleSaveWidget` e `handleDuplicateWidget`.

Nada em DashboardGrid, hook de layout, persistência, widgets ou demais módulos.