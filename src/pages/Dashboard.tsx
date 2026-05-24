import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, LayoutGrid, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import NovaObraDialog from '@/components/NovaObraDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import WidgetLibrary from '@/components/dashboard/WidgetLibrary';
import WidgetConfigDialog from '@/components/dashboard/WidgetConfigDialog';
import { WIDGET_REGISTRY } from '@/components/dashboard/widgetRegistry';
import { SIZE_PRESETS, WidgetInstance, GridLayoutItem } from '@/types/dashboard';
import { toast } from '@/hooks/use-toast';
type RglItem = GridLayoutItem;
type RglLayouts = Record<string, RglItem[]>;

export default function Dashboard() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const { pode } = usePermissions();
  const canSeeDiario = pode('diario_obra', 'visualizar');
  const { obras, refresh } = useDashboardData();

  const { widgets, setWidgets, gridConfig, setGridConfig, loading: layoutLoading, save } = useDashboardLayout();

  const [editMode, setEditMode] = useState(false);
  const [snapshot, setSnapshot] = useState<{ widgets: WidgetInstance[]; gridConfig: typeof gridConfig } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [configWidget, setConfigWidget] = useState<WidgetInstance | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [diarioDialogOpen, setDiarioDialogOpen] = useState(false);
  const [selectedObraDiario, setSelectedObraDiario] = useState('');

  const enterEdit = () => {
    setSnapshot({ widgets: JSON.parse(JSON.stringify(widgets)), gridConfig: JSON.parse(JSON.stringify(gridConfig)) });
    setEditMode(true);
  };
  const cancelEdit = () => {
    if (snapshot) { setWidgets(snapshot.widgets); setGridConfig(snapshot.gridConfig); }
    setEditMode(false);
    setSnapshot(null);
  };
  const saveEdit = async () => {
    await save(widgets, gridConfig);
    toast({ title: 'Layout salvo', description: 'Suas preferências do dashboard foram salvas.' });
    setEditMode(false);
    setSnapshot(null);
  };

  const handleLayoutChange = (_lg: RglItem[], all: RglLayouts) => {
    if (!editMode) return;
    const toItems = (arr: RglItem[]): GridLayoutItem[] => arr.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH }));
    setGridConfig({
      lg: all.lg ? toItems(all.lg) : gridConfig.lg,
      md: all.md ? toItems(all.md) : gridConfig.md,
      sm: all.sm ? toItems(all.sm) : gridConfig.sm,
    });
  };

  const handleAdd = (type: string) => {
    const def = WIDGET_REGISTRY[type];
    if (!def) return;
    const id = `w-${type}-${Date.now()}`;
    setWidgets(ws => [...ws, { id, type, size: def.defaultSize }]);
  };

  const handleSaveWidget = (next: WidgetInstance) => {
    setWidgets(ws => ws.map(w => w.id === next.id ? next : w));
  };
  const handleDuplicateWidget = (w: WidgetInstance) => {
    setWidgets(ws => [...ws, { ...w, id: `w-${w.type}-${Date.now()}` }]);
  };
  const handleDeleteWidget = (id: string) => {
    setWidgets(ws => ws.filter(w => w.id !== id));
    setGridConfig(gc => ({
      lg: gc.lg?.filter(l => l.i !== id),
      md: gc.md?.filter(l => l.i !== id),
      sm: gc.sm?.filter(l => l.i !== id),
    }));
  };
  const handleToggleHidden = (id: string) => {
    setWidgets(ws => ws.map(w => w.id === id ? { ...w, hidden: !w.hidden } : w));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral das suas obras</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!editMode ? (
            <>
              {canEdit && canSeeDiario && (
                <Button
                  onClick={() => {
                    if (obras.length === 1) navigate(`/diario?obra=${obras[0].id}`);
                    else { setSelectedObraDiario(''); setDiarioDialogOpen(true); }
                  }}
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base"
                >
                  <ClipboardList className="h-5 w-5 mr-2" /> Criar Diário
                </Button>
              )}
              {canEdit && pode('dashboard', 'criar') && (
                <Button onClick={() => setDialogOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" /> Nova Obra
                </Button>
              )}
              <Button onClick={enterEdit} variant="outline">
                <LayoutGrid className="h-4 w-4 mr-2" /> Personalizar Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setLibraryOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Widget
              </Button>
              <Button onClick={cancelEdit} variant="ghost">
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={saveEdit} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="h-4 w-4 mr-2" /> Salvar Layout
              </Button>
            </>
          )}
        </div>
      </div>

      {!layoutLoading && (
        <DashboardGrid
          widgets={widgets}
          gridConfig={gridConfig}
          editMode={editMode}
          onLayoutChange={handleLayoutChange}
          onConfigWidget={setConfigWidget}
          onToggleHidden={handleToggleHidden}
        />
      )}

      <WidgetLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} onAdd={(t) => { handleAdd(t); setLibraryOpen(false); }} />

      <WidgetConfigDialog
        widget={configWidget}
        onClose={() => setConfigWidget(null)}
        onSave={handleSaveWidget}
        onDuplicate={handleDuplicateWidget}
        onDelete={handleDeleteWidget}
      />

      {/* Diário dialog */}
      <Dialog open={diarioDialogOpen} onOpenChange={setDiarioDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Selecionar Obra</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select value={selectedObraDiario} onValueChange={setSelectedObraDiario}>
                <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                <SelectContent>
                  {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={!selectedObraDiario}
              onClick={() => { setDiarioDialogOpen(false); navigate(`/diario?obra=${selectedObraDiario}`); }}
            >
              <ClipboardList className="h-4 w-4 mr-2" /> Criar Diário
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NovaObraDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={refresh} />

      {canEdit && (
        <Button
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 md:hidden p-0"
          onClick={() => {
            if (obras.length === 1) navigate(`/diario?obra=${obras[0].id}`);
            else { setSelectedObraDiario(''); setDiarioDialogOpen(true); }
          }}
        >
          <ClipboardList className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
