## Diagnóstico

No arquivo `src/components/dashboard/WidgetConfigDialog.tsx` (linha 62), o Select de **Tamanho** está ligado diretamente à prop `widget.size` e chama `onSave({ ...widget, size, config })` no `onValueChange`.

Problema:
- O valor exibido (`value={widget.size}`) vem da prop, não de estado local.
- Ao escolher "Médio", `onSave` é disparado imediatamente. O parent atualiza o widget no layout, mas o `gridConfig` (w/h) é recalculado pelo `react-grid-layout` e/ou a prop `widget` do dialog não reflete a mudança no mesmo ciclo — então o Select volta a renderizar o valor antigo ("Pequeno").
- Diferente dos outros campos (título, cor, período, obra) que usam `useState` local (`config`) e só persistem no botão Salvar, o tamanho não tem estado local.

## Correção (apenas WidgetConfigDialog.tsx)

1. Adicionar estado local `const [size, setSize] = useState<WidgetSize>(widget?.size ?? 'small')`.
2. No `useEffect` existente que sincroniza com `widget`, sincronizar também `setSize(widget.size)`.
3. Trocar o Select de Tamanho:
   - `value={size}`
   - `onValueChange={(v) => setSize(v as WidgetSize)}`
4. No botão **Salvar**, persistir size junto: `onSave({ ...widget, size, config })`.
5. No **Duplicar**, também usar `size` local: `onDuplicate({ ...widget, size, config })`.
6. Logs temporários `console.log('[WidgetSize]', ...)` no `onValueChange`, no `useEffect` de sync e no clique de Salvar, exibindo: valor recebido pelo Select, valor enviado pelo onValueChange, estado local atual e valor da prop `widget.size`.

## Fora de escopo

Nenhuma alteração em `DashboardGrid`, `useDashboardLayout`, `widgetRegistry`, persistência, layout, ou outros widgets/fluxos.