import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { googleCalendar, GOOGLE_COLORS, type GoogleEvent } from "@/lib/googleCalendar";
import { Calendar as CalendarIcon, Link2, MapPin } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AgendaDoDiaWidget() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<GoogleEvent[]>([]);

  useEffect(() => {
    googleCalendar.status().then(s => {
      setConnected(s.connected);
      if (s.connected) {
        const now = new Date();
        googleCalendar.listEvents(startOfDay(now).toISOString(), endOfDay(now).toISOString())
          .then(r => setEvents(r.items)).catch(() => {});
      }
    }).catch(() => setConnected(false));
  }, []);

  const today = new Date();

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" /> Agenda do Dia
          </h3>
          <p className="text-xs text-muted-foreground capitalize">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/calendario")}>Ver tudo</Button>
      </div>

      {connected === false && (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">Conecte sua agenda Google para ver compromissos.</p>
          <Button size="sm" onClick={() => navigate("/calendario")} className="gap-1">
            <Link2 className="h-3.5 w-3.5" /> Conectar
          </Button>
        </div>
      )}

      {connected && events.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">Nenhum compromisso para hoje.</p>
      )}

      {connected && events.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{events.length} compromisso(s)</p>
          {events.slice(0, 5).map(e => {
            const color = GOOGLE_COLORS[e.colorId ?? "7"]?.bg ?? "#039be5";
            const start = parseISO(e.start.dateTime ?? `${e.start.date}T00:00:00`);
            return (
              <div key={e.id} className="flex items-start gap-2.5 rounded-md border p-2 hover:bg-accent/40 cursor-pointer"
                onClick={() => navigate("/calendario")}>
                <div className="w-1 self-stretch rounded-full" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    <span className="text-muted-foreground mr-2">
                      {e.start.dateTime ? format(start, "HH:mm") : "Dia todo"}
                    </span>
                    {e.summary ?? "(sem título)"}
                  </div>
                  {e.location && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" /> {e.location}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
