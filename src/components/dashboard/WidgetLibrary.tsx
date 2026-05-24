import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { WIDGET_REGISTRY, CATEGORY_LABELS, WidgetCategory } from './widgetRegistry';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
}

export default function WidgetLibrary({ open, onClose, onAdd }: Props) {
  const byCategory = Object.values(WIDGET_REGISTRY).reduce((acc, w) => {
    (acc[w.category] = acc[w.category] || []).push(w);
    return acc;
  }, {} as Record<WidgetCategory, typeof WIDGET_REGISTRY[string][]>);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Adicionar Widget</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-8">
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {CATEGORY_LABELS[cat as WidgetCategory]}
                </p>
                <div className="space-y-2">
                  {items.map(w => (
                    <Card key={w.type} className="hover:border-accent transition-colors">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{w.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{w.description}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onAdd(w.type)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
