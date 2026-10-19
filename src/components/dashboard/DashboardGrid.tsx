import { useEffect, useMemo, useRef, useState } from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetFrame from './WidgetFrame';
import DashboardErrorBoundary from './DashboardErrorBoundary';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { useIsMobile } from '@/hooks/use-mobile';
import { SIZE_PRESETS, WidgetInstance, GridLayoutItem } from '@/types/dashboard';

type RglItem = GridLayoutItem;
type RglLayouts = Record<string, RglItem[]>;

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
  // Screen (not container) width < 768px: stacked, read-only, sm layout derived and never persisted.
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(1200);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w && w > 0) setWidth(w);
      }
    });
    ro.observe(el);
    // initial measurement
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);
    return () => ro.disconnect();
  }, [isMobile]);

  // Drop widgets whose type is no longer registered, so a stale layout never breaks the page
  const safeWidgets = useMemo(() => widgets.filter(w => !!WIDGET_REGISTRY[w.type]), [widgets]);
  const visible = useMemo(() => safeWidgets.filter(w => editMode || !w.hidden), [safeWidgets, editMode]);

  const layouts: RglLayouts = useMemo(() => {
    const lg = (gridConfig.lg && gridConfig.lg.filter(l => visible.find(w => w.id === l.i))) || packDefault(visible);
    const lgIds = new Set(lg.map(l => l.i));
    const missing = visible.filter(w => !lgIds.has(w.id));
    const appended = packDefault(missing).map(l => ({ ...l, y: (lg.reduce((m, x) => Math.max(m, x.y + x.h), 0)) + l.y }));
    const fullLg = [...lg, ...appended];
    return {
      lg: fullLg,
      md: fullLg.map(l => ({ ...l, w: Math.min(l.w, 10), x: Math.min(l.x, 10 - 1) })),
      sm: visible.map((w, i) => ({ i: w.id, x: 0, y: i, w: 6, h: Math.max(SIZE_PRESETS[w.size].h, 3)})),
    };
  }, [visible, gridConfig]);


  // Mobile order: same as desktop, sorted by (y, x) of saved lg layout; unplaced widgets last.
  const mobileOrdered = useMemo(() => {
    const pos = new Map((gridConfig.lg ?? []).map(l => [l.i, l]));
    const placed = visible.filter(w => pos.has(w.id)).sort((a, b) => {
      const pa = pos.get(a.id)!, pb = pos.get(b.id)!;
      return pa.y - pb.y || pa.x - pb.x;
    });
    return [...placed, ...visible.filter(w => !pos.has(w.id))];
  }, [visible, gridConfig.lg]);

  const renderWidget = (w: WidgetInstance) => {
    const def = WIDGET_REGISTRY[w.type];
    if (!def) return null;
    const Comp = def.Component;
    return (
      <WidgetFrame
        editMode={editMode}
        title={w.config?.title || def.label}
        headerColor={w.config?.headerColor}
        hidden={w.hidden}
        onConfig={() => onConfigWidget(w)}
        onToggleHidden={() => onToggleHidden(w.id)}
      >
        <DashboardErrorBoundary fallbackTitle={`Erro ao carregar "${def.label}"`}>
          <Comp config={w.config} />
        </DashboardErrorBoundary>
      </WidgetFrame>
    );
  };

  if (isMobile) {
    return (
      <div ref={containerRef} className="grid grid-cols-2 gap-4 w-full">
        {mobileOrdered.map(w => {
          const p = SIZE_PRESETS[w.size];
          return (
            <div
              key={w.id}
              className={w.size === 'small' ? 'col-span-1 min-w-0' : 'col-span-2 min-w-0'}
              style={{ height: p.h * 70 + (p.h - 1) * 16 }}
            >
              {renderWidget(w)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <Responsive
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        width={width}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".drag-handle"
        onLayoutChange={onLayoutChange}
      >
        {visible.map(w => (
          <div key={w.id}>{renderWidget(w)}</div>
        ))}
      </Responsive>
    </div>
  );
}
