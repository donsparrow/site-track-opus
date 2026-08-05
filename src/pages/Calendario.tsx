import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { googleCalendar, GOOGLE_COLORS, type GoogleEvent } from "@/lib/googleCalendar";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Search, Loader2, Calendar as CalendarIcon,
  Link2, Unlink, MapPin, Trash2,
} from "lucide-react";
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  parseISO, startOfDay, startOfMonth, startOfWeek, addWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "month" | "week" | "day";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function eventStart(e: GoogleEvent): Date {
  return parseISO(e.start.dateTime ?? `${e.start.date}T00:00:00`);
}
function eventEnd(e: GoogleEvent): Date {
  return parseISO(e.end.dateTime ?? `${e.end.date}T23:59:59`);
}
function eventColor(e: GoogleEvent): string {
  return GOOGLE_COLORS[e.colorId ?? "7"]?.bg ?? "#039be5";
}

export default function Calendario() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GoogleEvent | null>(null);

  // Status load
  useEffect(() => {
    googleCalendar.status()
      .then((s) => { setConnected(s.connected); setEmail(s.email); })
      .catch(() => setConnected(false));
  }, []);

  // Range for current view
  const range = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
      return { start, end };
    }
    if (view === "week") {
      return { start: startOfWeek(cursor, { weekStartsOn: 0 }), end: endOfWeek(cursor, { weekStartsOn: 0 }) };
    }
    return { start: startOfDay(cursor), end: addDays(startOfDay(cursor), 1) };
  }, [view, cursor]);

  // Load events
  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    googleCalendar
      .listEvents(range.start.toISOString(), range.end.toISOString())
      .then((r) => setEvents(r.items))
      .catch((e) => toast.error(`Erro ao buscar eventos: ${e.message}`))
      .finally(() => setLoading(false));
  }, [connected, range.start, range.end]);

  const handleConnect = async () => {
    try {
      const redirect_uri = `${window.location.origin}/calendario/callback`;
      const r = await googleCalendar.authUrl(redirect_uri);
      window.location.href = r.url;
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await googleCalendar.disconnect();
      setConnected(false); setEmail(null); setEvents([]);
      toast.success("Conta Google desconectada.");
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(e =>
      (e.summary ?? "").toLowerCase().includes(q) ||
      (e.description ?? "").toLowerCase().includes(q) ||
      (e.location ?? "").toLowerCase().includes(q)
    );
  }, [events, search]);

  const navigateCursor = (dir: -1 | 1) => {
    if (view === "month") setCursor(addMonths(cursor, dir));
    else if (view === "week") setCursor(addWeeks(cursor, dir));
    else setCursor(addDays(cursor, dir));
  };

  const title = view === "month"
    ? format(cursor, "MMMM 'de' yyyy", { locale: ptBR })
    : view === "week"
      ? `${format(range.start, "d MMM", { locale: ptBR })} – ${format(range.end, "d MMM yyyy", { locale: ptBR })}`
      : format(cursor, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });

  // Not connected screen
  if (connected === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card className="p-10 text-center space-y-5">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Conecte seu Google Calendar</h1>
          <p className="text-muted-foreground">
            Conecte sua conta Google para visualizar e gerenciar seus eventos diretamente no sistema.
            Suas credenciais ficam protegidas e podem ser desconectadas a qualquer momento.
          </p>
          <Button size="lg" onClick={handleConnect} className="gap-2">
            <Link2 className="h-4 w-4" />
            Conectar Google Calendar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Conectado como <span className="font-medium">{email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDisconnect} className="gap-1">
            <Unlink className="h-3.5 w-3.5" /> Desconectar
          </Button>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> Novo evento
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateCursor(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => navigateCursor(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 font-semibold capitalize">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-9 w-48"
            />
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="day">Dia</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Calendar body */}
      <Card className="p-4 min-h-[60vh] relative">
        {loading && (
          <div className="absolute right-4 top-4 z-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {view === "month" && (
          <MonthGrid
            cursor={cursor}
            range={range}
            events={filteredEvents}
            onEventClick={(e) => { setEditing(e); setModalOpen(true); }}
            onDayClick={(d) => { setCursor(d); setEditing(null); setModalOpen(true); }}
          />
        )}
        {view === "week" && (
          <WeekDayList
            days={Array.from({ length: 7 }, (_, i) => addDays(range.start, i))}
            events={filteredEvents}
            onEventClick={(e) => { setEditing(e); setModalOpen(true); }}
          />
        )}
        {view === "day" && (
          <WeekDayList
            days={[cursor]}
            events={filteredEvents}
            onEventClick={(e) => { setEditing(e); setModalOpen(true); }}
          />
        )}
      </Card>

      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        defaultDate={cursor}
        onSaved={() => {
          setModalOpen(false);
          setLoading(true);
          googleCalendar.listEvents(range.start.toISOString(), range.end.toISOString())
            .then(r => setEvents(r.items))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));

        }}
      />
    </div>
  );
}

// ============= Month grid =============
function MonthGrid({
  cursor, range, events, onEventClick, onDayClick,
}: {
  cursor: Date; range: { start: Date; end: Date };
  events: GoogleEvent[];
  onEventClick: (e: GoogleEvent) => void;
  onDayClick: (d: Date) => void;
}) {
  const days: Date[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) days.push(d);
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map(w => (
          <div key={w} className="text-xs font-semibold text-muted-foreground text-center py-2">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const dayEvents = events.filter(e => isSameDay(eventStart(e), d));
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              className={`min-h-[100px] text-left rounded-md border p-1.5 transition hover:bg-accent/50 ${
                inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <div className={`text-xs font-semibold mb-1 flex items-center justify-center w-6 h-6 rounded-full ${
                isToday ? "bg-primary text-primary-foreground" : ""
              }`}>
                {format(d, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(e => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                    className="text-[10px] truncate rounded px-1 py-0.5 text-white"
                    style={{ background: eventColor(e) }}
                  >
                    {e.start.dateTime && <span className="opacity-80 mr-1">{format(eventStart(e), "HH:mm")}</span>}
                    {e.summary ?? "(sem título)"}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============= Week / Day list =============
function WeekDayList({
  days, events, onEventClick,
}: {
  days: Date[]; events: GoogleEvent[]; onEventClick: (e: GoogleEvent) => void;
}) {
  return (
    <div className="space-y-4">
      {days.map(d => {
        const dayEvents = events
          .filter(e => isSameDay(eventStart(e), d))
          .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime());
        const isToday = isSameDay(d, new Date());
        return (
          <div key={d.toISOString()}>
            <div className={`flex items-baseline gap-2 mb-2 pb-1 border-b ${isToday ? "border-primary" : ""}`}>
              <span className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                {format(d, "d")}
              </span>
              <span className="text-sm text-muted-foreground capitalize">
                {format(d, "EEEE, MMM", { locale: ptBR })}
              </span>
            </div>
            {dayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sem eventos</p>
            ) : (
              <div className="space-y-1.5">
                {dayEvents.map(e => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    className="w-full flex items-start gap-3 rounded-md border p-2.5 text-left hover:bg-accent/40 transition"
                  >
                    <div className="w-1 self-stretch rounded-full" style={{ background: eventColor(e) }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{e.summary ?? "(sem título)"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                        <span>
                          {e.start.dateTime
                            ? `${format(eventStart(e), "HH:mm")} – ${format(eventEnd(e), "HH:mm")}`
                            : "Dia inteiro"}
                        </span>
                        {e.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" /> {e.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============= Event Modal =============
function EventModal({
  open, onOpenChange, editing, defaultDate, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: GoogleEvent | null; defaultDate: Date; onSaved: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [attendees, setAttendees] = useState("");
  const [colorId, setColorId] = useState("7");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSummary(editing.summary ?? "");
      setDescription(editing.description ?? "");
      setLocation(editing.location ?? "");
      setColorId(editing.colorId ?? "7");
      const s = eventStart(editing);
      const e = eventEnd(editing);
      setDate(format(s, "yyyy-MM-dd"));
      setStartTime(editing.start.dateTime ? format(s, "HH:mm") : "09:00");
      setEndTime(editing.end.dateTime ? format(e, "HH:mm") : "10:00");
      setAttendees((editing.attendees ?? []).map(a => a.email).join(", "));
    } else {
      setSummary(""); setDescription(""); setLocation(""); setAttendees(""); setColorId("7");
      setDate(format(defaultDate, "yyyy-MM-dd"));
      setStartTime("09:00"); setEndTime("10:00");
    }
  }, [open, editing, defaultDate]);

  const handleSave = async () => {
    if (!summary.trim()) { toast.error("Título é obrigatório"); return; }
    setSaving(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();
      const payload = {
        summary,
        description: description || undefined,
        location: location || undefined,
        colorId,
        start: { dateTime: startISO, timeZone: tz },
        end: { dateTime: endISO, timeZone: tz },
        attendees: attendees
          .split(",").map(s => s.trim()).filter(Boolean).map(email => ({ email })),
      };
      if (editing) await googleCalendar.updateEvent(editing.id, payload);
      else await googleCalendar.createEvent(payload);
      toast.success(editing ? "Evento atualizado" : "Evento criado");
      onSaved();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm("Excluir este evento?")) return;
    setSaving(true);
    try {
      await googleCalendar.deleteEvent(editing.id);
      toast.success("Evento excluído");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={summary} onChange={e => setSummary(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Início</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Local</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Participantes (e-mails separados por vírgula)</Label>
            <Input value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="a@ex.com, b@ex.com" />
          </div>
          <div>
            <Label>Cor</Label>
            <Select value={colorId} onValueChange={setColorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(GOOGLE_COLORS).map(([id, c]) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ background: c.bg }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {editing && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? "Atualizar" : "Criar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
