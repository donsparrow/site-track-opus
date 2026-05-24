import { useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetFrame from './WidgetFrame';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { SIZE_PRESETS, WidgetInstance, GridLayoutItem } from '@/types/dashboard';

type RglItem = GridLayoutItem;
type RglLayouts = Record<string, RglItem[]>;
const ResponsiveGridLayout = WidthProvider(Responsive);

interface Props {
  widgets: WidgetInstance[];
  gridConfig: { lg?: GridLayoutItem[]; md?: GridLayoutItem[]; sm?: GridLayoutItem[] };
  editMode: boolean;
  onLayoutChange: (lg: RglItem[], all: RglLayouts) => void;
  onConfigWidget: (w: WidgetInstance) => void;
  onToggleHidden: (id: string) => void;
}

function packDefault(widgets: WidgetInstance[]): GridLayoutItem[] {
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

export default function DashboardGrid({ widgets, gridConfig, editMode, onLayoutChange, onConfigWidget, onToggleHidden }: Props) {
  const visible = useMemo(() => widgets.filter(w => editMode || !w.hidden), [widgets, editMode]);

  const layouts: RglLayouts = useMemo(() => {
    const lg = (gridConfig.lg && gridConfig.lg.filter(l => visible.find(w => w.id === l.i))) || packDefault(visible);
    const lgIds = new Set(lg.map(l => l.i));
    const missing = visible.filter(w => !lgIds.has(w.id));
    const appended = packDefault(missing).map(l => ({ ...l, y: (lg.reduce((m, x) => Math.max(m, x.y + x.h), 0)) + l.y }));
    const fullLg = [...lg, ...appended];
    return {
      lg: fullLg,
      md: fullLg.map(l => ({ ...l, w: Math.min(l.w, 10), x: Math.min(l.x, 10 - 1) })),
      sm: visible.map((w, i) => ({ i: w.id, x: 0, y: i * 3, w: 6, h: SIZE_PRESETS[w.size].h })),
    };
  }, [visible, gridConfig]);

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1024, md: 768, sm: 0 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={70}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      isDraggable={editMode}
      isResizable={editMode}
      draggableHandle=".drag-handle"
      onLayoutChange={onLayoutChange}
    >
      {visible.map(w => {
        const def = WIDGET_REGISTRY[w.type];
        if (!def) return <div key={w.id} />;
        const Comp = def.Component;
        return (
          <div key={w.id}>
            <WidgetFrame
              editMode={editMode}
              title={w.config?.title || def.label}
              headerColor={w.config?.headerColor}
              hidden={w.hidden}
              onConfig={() => onConfigWidget(w)}
              onToggleHidden={() => onToggleHidden(w.id)}
            >
              <Comp config={w.config} />
            </WidgetFrame>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
