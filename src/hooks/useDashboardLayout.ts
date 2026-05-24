import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardLayoutData, WidgetInstance, GridLayoutItem } from '@/types/dashboard';
import { SIZE_PRESETS } from '@/types/dashboard';

// Default layout reproduces the original dashboard arrangement
const DEFAULT_WIDGETS: WidgetInstance[] = [
  { id: 'w-kpi-contratos', type: 'kpi-contratos', size: 'small' },
  { id: 'w-kpi-recebido', type: 'kpi-recebido', size: 'small' },
  { id: 'w-kpi-gastos', type: 'kpi-gastos', size: 'small' },
  { id: 'w-kpi-parcelas-atrasadas', type: 'kpi-parcelas-atrasadas', size: 'small' },
  { id: 'w-agenda-dia', type: 'agenda-dia', size: 'full' },
  { id: 'w-ferramentas-resumo', type: 'ferramentas-resumo', size: 'full' },
  { id: 'w-despesas-tipo', type: 'despesas-tipo', size: 'medium' },
  { id: 'w-evolucao-mensal', type: 'evolucao-mensal', size: 'medium' },
];

function buildDefaultGrid(widgets: WidgetInstance[]): GridLayoutItem[] {
  // Pack widgets row by row at 12 cols
  let x = 0, y = 0, rowH = 0;
  return widgets.map(w => {
    const p = SIZE_PRESETS[w.size];
    if (x + p.w > 12) { x = 0; y += rowH; rowH = 0; }
    const item: GridLayoutItem = { i: w.id, x, y, w: p.w, h: p.h, minW: p.minW, minH: p.minH };
    x += p.w;
    if (p.h > rowH) rowH = p.h;
    return item;
  });
}

export function useDashboardLayout() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetInstance[]>(DEFAULT_WIDGETS);
  const [gridConfig, setGridConfig] = useState<DashboardLayoutData['gridConfig']>({ lg: buildDefaultGrid(DEFAULT_WIDGETS) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('dashboard_layouts')
        .select('widgets, grid_config')
        .eq('user_id', user.id)
        .eq('layout_name', 'default')
        .maybeSingle();

      if (data && Array.isArray(data.widgets) && data.widgets.length > 0) {
        setWidgets(data.widgets as WidgetInstance[]);
        setGridConfig((data.grid_config as any) || { lg: buildDefaultGrid(data.widgets) });
      } else {
        setWidgets(DEFAULT_WIDGETS);
        setGridConfig({ lg: buildDefaultGrid(DEFAULT_WIDGETS) });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = useCallback(async (nextWidgets: WidgetInstance[], nextGrid: DashboardLayoutData['gridConfig']) => {
    if (!user) return;
    setSaving(true);
    await (supabase as any)
      .from('dashboard_layouts')
      .upsert({
        user_id: user.id,
        layout_name: 'default',
        widgets: nextWidgets,
        grid_config: nextGrid,
      }, { onConflict: 'user_id,layout_name' });
    setSaving(false);
  }, [user]);

  return {
    widgets, setWidgets,
    gridConfig, setGridConfig,
    loading, saving,
    save,
    buildDefaultGrid,
    DEFAULT_WIDGETS,
  };
}
