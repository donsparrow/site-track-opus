import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Settings, Eye, EyeOff, GripVertical } from 'lucide-react';

interface Props {
  editMode: boolean;
  title?: string;
  headerColor?: string;
  hidden?: boolean;
  onConfig: () => void;
  onToggleHidden: () => void;
  children: ReactNode;
}

export default function WidgetFrame({ editMode, title, headerColor, hidden, onConfig, onToggleHidden, children }: Props) {
  if (hidden && !editMode) return null;

  return (
    <div
      className={cn(
        'relative h-full w-full transition-all duration-200 ease-out',
        editMode && 'ring-2 ring-accent/40 ring-offset-2 ring-offset-background rounded-lg border-2 border-dashed border-accent/50',
        hidden && editMode && 'opacity-40'
      )}
    >
      {editMode && (
        <div className="absolute -top-3 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1 pointer-events-auto">
            <span className="drag-handle cursor-move bg-accent text-accent-foreground rounded-md px-1.5 py-0.5 text-[10px] flex items-center gap-1 shadow">
              <GripVertical className="h-3 w-3" />
              {title || 'arrastar'}
            </span>
          </div>
          <div className="flex items-center gap-1 pointer-events-auto">
            <Button size="icon" variant="secondary" className="h-6 w-6 shadow" onClick={onToggleHidden} title={hidden ? 'Mostrar' : 'Ocultar'}>
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button size="icon" variant="secondary" className="h-6 w-6 shadow" onClick={onConfig} title="Configurar">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      {headerColor && (
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg z-10 pointer-events-none" style={{ backgroundColor: headerColor }} />
      )}
      <div className="h-full w-full overflow-hidden rounded-lg">
        {children}
      </div>
    </div>
  );
}
