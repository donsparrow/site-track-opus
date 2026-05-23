import { supabase } from "@/integrations/supabase/client";

const FN = "google-calendar";

async function call<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FN, { body: { action, ...body } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export const googleCalendar = {
  authUrl: (redirect_uri: string) => call<{ url: string }>("auth-url", { redirect_uri }),
  status: () => call<{ connected: boolean; email: string | null }>("status"),
  exchange: (code: string, redirect_uri: string) => call<{ ok: boolean; email: string }>("exchange", { code, redirect_uri }),
  disconnect: () => call<{ ok: boolean }>("disconnect"),
  listEvents: (timeMin: string, timeMax: string) => call<{ items: GoogleEvent[] }>("list-events", { timeMin, timeMax }),
  createEvent: (event: GoogleEventInput) => call<{ event: GoogleEvent }>("create-event", { event }),
  updateEvent: (eventId: string, event: GoogleEventInput) => call<{ event: GoogleEvent }>("update-event", { eventId, event }),
  deleteEvent: (eventId: string) => call<{ ok: boolean }>("delete-event", { eventId }),
};
  status: () => call<{ connected: boolean; email: string | null }>("status"),
  exchange: (code: string, redirect_uri: string) => call<{ ok: boolean; email: string }>("exchange", { code, redirect_uri }),
  disconnect: () => call<{ ok: boolean }>("disconnect"),
  listEvents: (timeMin: string, timeMax: string) => call<{ items: GoogleEvent[] }>("list-events", { timeMin, timeMax }),
  createEvent: (event: GoogleEventInput) => call<{ event: GoogleEvent }>("create-event", { event }),
  updateEvent: (eventId: string, event: GoogleEventInput) => call<{ event: GoogleEvent }>("update-event", { eventId, event }),
  deleteEvent: (eventId: string) => call<{ ok: boolean }>("delete-event", { eventId }),
};

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string }[];
  htmlLink?: string;
}

export interface GoogleEventInput {
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string }[];
}

// Google Calendar default color palette
export const GOOGLE_COLORS: Record<string, { bg: string; label: string }> = {
  "1": { bg: "#7986cb", label: "Lavanda" },
  "2": { bg: "#33b679", label: "Sálvia" },
  "3": { bg: "#8e24aa", label: "Uva" },
  "4": { bg: "#e67c73", label: "Flamingo" },
  "5": { bg: "#f6c026", label: "Banana" },
  "6": { bg: "#f5511d", label: "Tangerina" },
  "7": { bg: "#039be5", label: "Pavão" },
  "8": { bg: "#616161", label: "Grafite" },
  "9": { bg: "#3f51b5", label: "Mirtilo" },
  "10": { bg: "#0b8043", label: "Manjericão" },
  "11": { bg: "#d60000", label: "Tomate" },
};
