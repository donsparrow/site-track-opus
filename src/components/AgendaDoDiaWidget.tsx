import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { googleCalendar, GOOGLE_COLORS, type GoogleEvent } from "@/lib/googleCalendar";
import { Calendar as CalendarIcon, Link2, MapPin, ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import {
  format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, addMonths, isSameDay, isSameMonth, isToday
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AgendaDoDiaWidget() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayEvents, setTodayEvents] = useState<GoogleEvent[]>([]);
  const [monthEvents, setMonthEvents] = useState<GoogleEvent[]>([]);
  const [cursor, setCursor] = useState(new Date());

  const today = new Date();

  useEffect(() => {
    googleCalendar.status()
      .then(s => {
        setConnected(s.connected);
        if (!s.connected) { setLoading(false); return; }
        const now = new Date();
        return googleCalendar.listEvents(startOfDay(now).toISOString(), endOfDay(now).toISOString())
          .then(r => setTodayEvents(r.items))
          .finally(() => setLoading(false));
      })
      .catch(() => { setConnected(false); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!connected) return;
    googleCalendar.listEvents(startOfMonth(cursor).toISOString(), endOfMonth(cursor).toISOString())
      .then(r => setMonthEvents(r.items))
      .catch(() => {});
  }, [connected, cursor]);

  const daysWithEvents = useMemo(() => {
    const set = new Set<string>();
    monthEvents.forEach(e => {
      const d = parseISO(e.start.dateTime ?? `${e.start.date}T00:00:00`);
      set.add(format(d, "yyyy-MM-dd"));
    });
    return set;
  }, [monthEvents]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [cursor]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" /> Agenda do Dia
          </h3>
          <p className="text-xs text-muted-foreground capitalize">
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/calendario")}>Ver calendário</Button>
      </div>

      {connected === false && (
        <div className="text-center py-8 space-y-3 border border-dashed rounded-md">
          <CalendarOff className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground px-4">
            Conecte sua conta Google para visualizar seus compromissos.
          </p>
          <Button size="sm" onClick={() => navigate("/calendario")} className="gap-1">
            <Link2 className="h-3.5 w-3.5" /> Conectar Google Calendar
          </Button>
        </div>
      )}

      {connected && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          {/* Lista de eventos do dia */}
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-display font-bold text-primary">{todayEvents.length}</span>
              <span className="text-sm text-muted-foreground">
                compromisso{todayEvents.length === 1 ? "" : "s"} hoje
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground py-4">Carregando...</p>
            ) : todayEvents.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-md">
                <CalendarOff className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum compromisso para hoje.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {todayEvents.map(e => {
                  const color = GOOGLE_COLORS[e.colorId ?? "7"]?.bg ?? "#039be5";
                  const start = parseISO(e.start.dateTime ?? `${e.start.date}T00:00:00`);
                  return (
                    <div
                      key={e.id}
                      className="flex items-start gap-2.5 rounded-md border p-2.5 hover:bg-accent/40 cursor-pointer transition-colors"
                      onClick={() => navigate("/calendario")}
                    >
                      <div className="w-1 self-stretch rounded-full" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          <span className="text-muted-foreground mr-2 tabular-nums">
                            {e.start.dateTime ? format(start, "HH:mm") : "Dia todo"}
                          </span>
                          {e.summary ?? "(sem título)"}
                        </div>
                        {e.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                            <MapPin className="h-3 w-3" /> {e.location}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mini calendário mensal */}
          <div className="lg:border-l lg:pl-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold capitalize">
                {format(cursor, "MMMM yyyy", { locale: ptBR })}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCursor(addMonths(cursor, -1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCursor(addMonths(cursor, 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
              ))}
              {gridDays.map(d => {
                const key = format(d, "yyyy-MM-dd");
                const hasEvent = daysWithEvents.has(key);
                const inMonth = isSameMonth(d, cursor);
                const isCurrent = isToday(d);
                return (
                  <button
                    key={key}
                    onClick={() => navigate("/calendario")}
                    className={cn(
                      "relative aspect-square text-xs rounded-md flex items-center justify-center transition-colors",
                      !inMonth && "text-muted-foreground/40",
                      inMonth && !isCurrent && "hover:bg-accent",
                      isCurrent && "bg-primary text-primary-foreground font-bold"
                    )}
                  >
                    {format(d, "d")}
                    {hasEvent && (
                      <span className={cn(
                        "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                        isCurrent ? "bg-primary-foreground" : "bg-accent"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
