export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export type WidgetPeriod = 'today' | '7d' | '30d' | '3m' | 'custom';

export interface WidgetConfig {
  title?: string;
  headerColor?: string;
  visualizationType?: string;
  period?: WidgetPeriod;
  periodStart?: string;
  periodEnd?: string;
  obraId?: string;
}

export interface WidgetInstance {
  id: string;            // unique instance id
  type: string;          // key in widgetRegistry
  size: WidgetSize;
  hidden?: boolean;
  config?: WidgetConfig;
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardLayoutData {
  widgets: WidgetInstance[];
  gridConfig: {
    lg?: GridLayoutItem[];
    md?: GridLayoutItem[];
    sm?: GridLayoutItem[];
  };
}

export const SIZE_PRESETS: Record<WidgetSize, { w: number; h: number; minW: number; minH: number }> = {
  small: { w: 3, h: 2, minW: 2, minH: 2 },
  medium: { w: 6, h: 2, minW: 3, minH: 2 },
  large: { w: 6, h: 4, minW: 4, minH: 3 },
  full: { w: 12, h: 4, minW: 6, minH: 3 },
};
