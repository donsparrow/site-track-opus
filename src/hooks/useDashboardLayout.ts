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
  const { user, loading: authLoading } = useAuth();
  const [widgets, setWidgets] = useState<WidgetInstance[]>(DEFAULT_WIDGETS);
  const [gridConfig, setGridConfig] = useState<DashboardLayoutData['gridConfig']>({ lg: buildDefaultGrid(DEFAULT_WIDGETS) });
  // IMPORTANT: start as false so the Dashboard never blocks on this hook.
  // Personalized layout loads silently in the background once the session resolves.
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If auth is still resolving or there is no user (preview iframe blocks cookies),
    // keep the default layout and do nothing — never block render.
    if (authLoading || !user) return;

    let cancelled = false;
    setLoading(true);
    // Safety timeout: never stay in loading for more than 3s
    const safety = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('dashboard_layouts')
          .select('widgets, grid_config')
          .eq('user_id', user.id)
          .eq('layout_name', 'default')
          .maybeSingle();

        if (cancelled) return;

        if (!error && data && Array.isArray(data.widgets) && data.widgets.length > 0) {
          const validWidgets = (data.widgets as any[]).filter(
            (w) => w && typeof w === 'object' && typeof w.id === 'string' && typeof w.type === 'string'
          ) as WidgetInstance[];
          if (validWidgets.length > 0) {
            setWidgets(validWidgets);
            const gc = (data.grid_config as any) || {};
            setGridConfig({
              lg: Array.isArray(gc.lg) ? gc.lg : buildDefaultGrid(validWidgets),
              md: Array.isArray(gc.md) ? gc.md : undefined,
              sm: Array.isArray(gc.sm) ? gc.sm : undefined,
            });
          }
        }
        // On error or no row: keep the default layout silently.
      } catch (e) {
        console.error('[useDashboardLayout] load failed, keeping default', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [user, authLoading]);


  const save = useCallback(async (nextWidgets: WidgetInstance[], nextGrid: DashboardLayoutData['gridConfig']) => {
    if (!user) return;
    setSaving(true);
    try {
      await (supabase as any)
        .from('dashboard_layouts')
        .upsert({
          user_id: user.id,
          layout_name: 'default',
          widgets: nextWidgets,
          grid_config: nextGrid,
        }, { onConflict: 'user_id,layout_name' });
    } catch (e) {
      console.error('[useDashboardLayout] save failed', e);
    } finally {
      setSaving(false);
    }
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
